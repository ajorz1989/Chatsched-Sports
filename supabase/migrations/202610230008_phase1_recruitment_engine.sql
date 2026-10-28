-- Phase 1 recruitment engine: recruiter searches, reverse matching and recruitment pipeline helpers.
create table if not exists public.recruiter_saved_searches (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 120),
  query text,
  sport_id uuid references public.sports(id) on delete set null,
  position text,
  level text,
  location text,
  alert_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recruiter_saved_searches_org_idx on public.recruiter_saved_searches(organisation_id,created_at desc);
alter table public.recruiter_saved_searches enable row level security;
create policy "Verified organisation owners manage recruiter searches"
on public.recruiter_saved_searches for all to authenticated
using(exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid()) and o.verification_status='verified') or private.is_sport_admin())
with check(exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid()) and o.verification_status='verified') or private.is_sport_admin());
grant select,insert,update,delete on public.recruiter_saved_searches to authenticated;

-- A safer, richer reverse-match function. It returns reasons and keeps the ranking explainable.
drop function if exists public.match_opportunity_athletes(uuid);
create or replace function public.match_opportunity_athletes(target_opportunity uuid)
returns table (
  athlete_id uuid, display_name text, avatar_url text, sport text, discipline text,
  "position" text, playing_level text, location text, score integer, reasons jsonb,
  age integer, availability text
)
language sql security invoker set search_path=public
as $$
  with target as (
    select o.*,s.name sport_name
    from public.opportunities o left join public.sports s on s.id=o.sport_id
    where o.id=target_opportunity
  ), candidates as (
    select p.id athlete_id,p.display_name,p.avatar_url,
      s.name sport,ap.discipline,ap.position,ap.playing_level,
      coalesce(ap.location,p.location) location,ap.date_of_birth,ap.availability,
      t.sport_name,t.discipline target_discipline,t.positions target_positions,
      t.competition_level,t.minimum_age,t.maximum_age,t.location target_location
    from target t
    join public.athlete_profiles ap on ap.visibility='public'
    join public.profiles p on p.id=ap.user_id and p.account_type='athlete'
    left join public.sports s on s.id=ap.primary_sport_id
  ), scored as (
    select c.*,
      (case when c.sport_name is not null and lower(coalesce(c.sport,''))=lower(c.sport_name) then 35 else 0 end
       + case when c.target_discipline is null or c.target_discipline='' then 10
              when c.discipline is not null and (c.discipline ilike '%'||c.target_discipline||'%' or c.target_discipline ilike '%'||c.discipline||'%') then 15 else 0 end
       + case when coalesce(array_length(c.target_positions,1),0)=0 then 10
              when c.position is not null and c.position=any(c.target_positions) then 15 else 0 end
       + case when c.competition_level is null or c.playing_level is null then 5
              when c.playing_level ilike '%'||c.competition_level||'%' then 15 else 0 end
       + case when c.date_of_birth is null then 0
              when c.minimum_age is null or extract(year from age(current_date,c.date_of_birth))>=c.minimum_age then 5 else -10 end
       + case when c.date_of_birth is null then 0
              when c.maximum_age is null or extract(year from age(current_date,c.date_of_birth))<=c.maximum_age then 5 else -10 end
       + case when c.target_location is null or c.location is null then 3
              when lower(c.location) like '%'||lower(c.target_location)||'%' or lower(c.target_location) like '%'||lower(c.location)||'%' then 5 else 0 end
      )::integer score_value
    from candidates c
  )
  select athlete_id,display_name,avatar_url,sport,discipline,position,playing_level,location,
    greatest(0,least(100,score_value))::integer,
    jsonb_build_array(
      case when sport_name is not null and lower(coalesce(sport,''))=lower(sport_name) then 'Sport matches' end,
      case when target_discipline is not null and discipline is not null and (discipline ilike '%'||target_discipline||'%' or target_discipline ilike '%'||discipline||'%') then 'Discipline matches' end,
      case when coalesce(array_length(target_positions,1),0)=0 or (position is not null and position=any(target_positions)) then 'Position fits' end,
      case when competition_level is not null and playing_level is not null and playing_level ilike '%'||competition_level||'%' then 'Level fits' end,
      case when date_of_birth is not null and (minimum_age is null or extract(year from age(current_date,date_of_birth))>=minimum_age) and (maximum_age is null or extract(year from age(current_date,date_of_birth))<=maximum_age) then 'Age eligible' end,
      case when target_location is not null and location is not null and (lower(location) like '%'||lower(target_location)||'%' or lower(target_location) like '%'||lower(location)||'%') then 'Location aligns' end,
      case when availability is null then 'Availability not supplied' end
    ) - 'null' reasons,
    case when date_of_birth is null then null else extract(year from age(current_date,date_of_birth))::integer end,
    availability
  from scored
  order by score_value desc,display_name asc;
$$;
revoke all on function public.match_opportunity_athletes(uuid) from public,anon;
grant execute on function public.match_opportunity_athletes(uuid) to authenticated;

-- Notify recruiters when a verified opportunity matches one of their saved searches.
create or replace function private.notify_recruiter_saved_searches()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare sport_name text;
begin
  if new.status<>'published' or new.verification_status<>'verified' then return new; end if;
  select name into sport_name from public.sports where id=new.sport_id;
  insert into public.notifications(user_id,notification_type,title,body,target_path)
  select distinct rss.created_by,'recruiter_saved_search_alert',
    'A new opportunity matches your saved recruiter search',
    '“'||new.title||'” may match “'||rss.name||'”.','/opportunities/'||new.id
  from public.recruiter_saved_searches rss
  where rss.alert_enabled
    and (
      rss.query is null or lower(new.title||' '||coalesce(new.summary,'')||' '||coalesce(new.location,'')) like '%'||lower(rss.query)||'%'
    )
    and (rss.sport_id is null or rss.sport_id=new.sport_id)
    and (rss.position is null or new.positions @> array[rss.position]::text[] or exists(select 1 from unnest(coalesce(new.positions,'{}'::text[])) p where lower(p) like '%'||lower(rss.position)||'%'))
    and (rss.level is null or new.competition_level is null or lower(new.competition_level) like '%'||lower(rss.level)||'%')
    and (rss.location is null or new.location is null or lower(new.location) like '%'||lower(rss.location)||'%')
    and not exists(select 1 from public.notifications n where n.user_id=rss.created_by and n.target_path='/opportunities/'||new.id and n.notification_type='recruiter_saved_search_alert' and n.created_at>now()-interval '7 days');
  return new;
end; $$;
revoke all on function private.notify_recruiter_saved_searches() from public,anon,authenticated;
drop trigger if exists notify_recruiter_saved_searches_after_opportunity on public.opportunities;
create trigger notify_recruiter_saved_searches_after_opportunity after insert or update of status,verification_status on public.opportunities for each row execute function private.notify_recruiter_saved_searches();

-- Keep a recruiter pipeline status set explicit and auditable.
alter table public.opportunity_applications
  add constraint opportunity_applications_recruitment_status_check
  check(status in ('submitted','reviewing','shortlisted','declined','accepted','withdrawn','rejected')) not valid;
