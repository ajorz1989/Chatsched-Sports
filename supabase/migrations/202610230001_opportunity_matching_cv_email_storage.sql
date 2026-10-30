-- ChatSched Sport opportunity matching, application snapshots, saved searches, media storage and email preferences.
-- Apply after the existing Sport migrations 001-009.

alter table public.athlete_profiles
  add column if not exists date_of_birth date,
  add column if not exists media_kit_url text,
  add column if not exists cv_url text;

alter table public.opportunities
  add column if not exists minimum_age integer check (minimum_age is null or minimum_age >= 0),
  add column if not exists maximum_age integer check (maximum_age is null or maximum_age >= 0),
  add column if not exists number_of_places integer check (number_of_places is null or number_of_places > 0),
  add column if not exists start_date date,
  add column if not exists application_method text,
  add column if not exists application_url text,
  add constraint opportunities_age_range_check check (
    minimum_age is null or maximum_age is null or maximum_age >= minimum_age
  );

alter table public.opportunity_applications
  add column if not exists cv_consent boolean not null default false,
  add column if not exists cv_consent_at timestamptz,
  add column if not exists application_snapshot jsonb not null default '{}'::jsonb;

create index if not exists opportunities_matching_idx
  on public.opportunities(sport_id, discipline, minimum_age, maximum_age, start_date);

create table if not exists public.saved_opportunity_searches (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  query text,
  sport_id uuid references public.sports(id) on delete set null,
  opportunity_type text check (opportunity_type is null or opportunity_type in ('trial','academy','scholarship','scouting','sponsorship','coaching','event','development')),
  location text,
  minimum_age integer check (minimum_age is null or minimum_age >= 0),
  maximum_age integer check (maximum_age is null or maximum_age >= 0),
  alert_enabled boolean not null default true,
  last_alerted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_age is null or maximum_age is null or maximum_age >= minimum_age)
);

create index if not exists saved_opportunity_searches_athlete_idx
  on public.saved_opportunity_searches(athlete_id, created_at desc);

create table if not exists public.email_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  application_updates boolean not null default true,
  opportunity_recommendations boolean not null default true,
  saved_search_alerts boolean not null default true,
  weekly_digest boolean not null default true,
  marketing boolean not null default false,
  digest_day smallint not null default 1 check (digest_day between 0 and 6),
  digest_hour smallint not null default 8 check (digest_hour between 0 and 23),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  template_key text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_queue_status_idx
  on public.email_queue(status, scheduled_for);

create table if not exists public.opportunity_match_events (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (opportunity_id, athlete_id)
);

create index if not exists opportunity_match_events_opportunity_idx
  on public.opportunity_match_events(opportunity_id, score desc);

alter table public.saved_opportunity_searches enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_queue enable row level security;
alter table public.opportunity_match_events enable row level security;

create policy "Athletes manage their saved searches"
  on public.saved_opportunity_searches for all to authenticated
  using (athlete_id = (select auth.uid()))
  with check (athlete_id = (select auth.uid()));

create policy "Members manage their email preferences"
  on public.email_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Members create their email preferences"
  on public.email_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Members update their email preferences"
  on public.email_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Members read their email queue"
  on public.email_queue for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Organisation owners read opportunity matches"
  on public.opportunity_match_events for select to authenticated
  using (
    exists (
      select 1 from public.opportunities p
      join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id and o.owner_id = (select auth.uid())
    )
    or private.is_sport_admin()
  );

grant select, insert, update, delete on public.saved_opportunity_searches to authenticated;
grant select, insert, update on public.email_preferences to authenticated;
grant select on public.email_queue to authenticated;
grant select on public.opportunity_match_events to authenticated;

grant update (date_of_birth, media_kit_url, cv_url, updated_at) on public.athlete_profiles to authenticated;
grant update (
  minimum_age, maximum_age, number_of_places, start_date, application_method,
  application_url, updated_at
) on public.opportunities to authenticated;

grant insert (
  opportunity_id, athlete_id, message, cv_consent, cv_consent_at, application_snapshot
) on public.opportunity_applications to authenticated;

-- Create a safe public media bucket for athlete-owned images, portfolio media and CV/media-kit files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sport-media',
  'sport-media',
  true,
  10485760,
  array[
    'image/jpeg','image/png','image/webp',
    'application/pdf','video/mp4','video/webm'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Athletes upload sport media" on storage.objects;
create policy "Athletes upload sport media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sport-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Athletes update sport media" on storage.objects;
create policy "Athletes update sport media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'sport-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'sport-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Athletes delete sport media" on storage.objects;
create policy "Athletes delete sport media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sport-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Public read sport media" on storage.objects;
create policy "Public read sport media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'sport-media');

-- Ranked athlete matching. The score is deliberately explainable rather than a black box.
create or replace function public.match_opportunity_athletes(target_opportunity uuid)
returns table (athlete_id uuid, display_name text, avatar_url text, sport text, discipline text, "position" text, playing_level text, location text, score integer, reasons jsonb)
language sql security invoker set search_path = public
as $$
  with target as (
    select o.*, s.name as sport_name
    from opportunities o left join sports s on s.id=o.sport_id
    where o.id=target_opportunity
  ),
  candidates as (
    select p.id athlete_id,p.display_name,p.avatar_url,s.name sport,ap.discipline,ap.position,ap.playing_level,
      coalesce(ap.location,p.location) location,ap.date_of_birth,t.sport_name,t.discipline target_discipline,
      t.positions target_positions,t.competition_level,t.minimum_age,t.maximum_age,t.location target_location
    from target t
    join athlete_profiles ap on ap.visibility='public'
    join profiles p on p.id=ap.user_id and p.account_type='athlete'
    left join sports s on s.id=ap.primary_sport_id
  ),
  scored as (
    select c.*,
      (case when c.sport_name is not null and c.sport=c.sport_name then 35 else 0 end
       + case when c.target_discipline is null then 15 when c.discipline is not null and (
           c.discipline ilike '%'||c.target_discipline||'%' or c.target_discipline ilike '%'||c.discipline||'%'
         ) then 15 else 0 end
       + case when coalesce(array_length(c.target_positions,1),0)=0 or c.position=any(c.target_positions) then 15 else 0 end
       + case when c.competition_level is null or c.playing_level is null or c.playing_level ilike '%'||c.competition_level||'%' then 15 else 0 end
       + case when c.date_of_birth is null then 0 when c.minimum_age is null or extract(year from age(current_date,c.date_of_birth))>=c.minimum_age then 5 else 0 end
       + case when c.date_of_birth is null then 0 when c.maximum_age is null or extract(year from age(current_date,c.date_of_birth))<=c.maximum_age then 5 else 0 end
       + case when c.target_location is null or c.location is null or c.location ilike '%'||c.target_location||'%' then 5 else 0 end
      )::integer score_value
    from candidates c
  )
  select athlete_id,display_name,avatar_url,sport,discipline,position,playing_level,location,score_value,
    jsonb_build_array(
      case when sport=sport_name then 'Sport matches' end,
      case when target_discipline is not null and discipline is null then 'Discipline unknown' end,
      case when competition_level is not null and playing_level is null then 'Level unknown' end,
      case when date_of_birth is null and (minimum_age is not null or maximum_age is not null) then 'Age unknown' end
    ) - 'null' reasons
  from scored order by score_value desc,display_name asc;
$$;

revoke all on function public.match_opportunity_athletes(uuid) from public, anon;
grant execute on function public.match_opportunity_athletes(uuid) to authenticated;

-- Automatically create an email queue item when a user-facing notification is generated.
create or replace function private.enqueue_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  preference public.email_preferences%rowtype;
  recipient_email text;
begin
  select * into preference from public.email_preferences where user_id = new.user_id;
  if preference.user_id is null then
    insert into public.email_preferences(user_id) values (new.user_id)
    on conflict (user_id) do nothing;
    select * into preference from public.email_preferences where user_id = new.user_id;
  end if;

  select email into recipient_email from public.profiles where id = new.user_id;
  if recipient_email is null then return new; end if;

  if new.notification_type = 'application_status' and not preference.application_updates then return new; end if;
  if new.notification_type in ('opportunity_recommendation','saved_search_alert') and not preference.opportunity_recommendations and not preference.saved_search_alerts then return new; end if;

  insert into public.email_queue(user_id, notification_id, template_key, subject, payload)
  values (
    new.user_id, new.id, 'notification',
    new.title,
    jsonb_build_object('title',new.title,'body',new.body,'target_path',new.target_path,'email',recipient_email)
  );
  return new;
end;
$$;

revoke all on function private.enqueue_notification_email() from public, anon, authenticated;
drop trigger if exists enqueue_notification_email_after_notification on public.notifications;
create trigger enqueue_notification_email_after_notification
  after insert on public.notifications
  for each row execute function private.enqueue_notification_email();

-- Generate in-app alerts for saved searches and profile-based recommendations.
create or replace function private.notify_matching_athletes()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  sport_name text;
begin
  if new.status <> 'published' or new.verification_status <> 'verified' then return new; end if;
  select name into sport_name from public.sports where id=new.sport_id;

  insert into public.notifications(user_id,notification_type,title,body,target_path)
  select distinct s.athlete_id,'saved_search_alert','A saved search found a new opportunity',
    '“'||new.title||'” matches one of your saved searches.','/opportunities/'||new.id
  from public.saved_opportunity_searches s
  join public.profiles p on p.id=s.athlete_id and p.account_type='athlete'
  where s.alert_enabled
    and (
      s.query is null
      or lower(new.title||' '||coalesce(new.summary,'')||' '||coalesce(new.location,'')) like '%'||lower(s.query)||'%'
    )
    and (s.opportunity_type is null or s.opportunity_type=new.opportunity_type)
    and (s.location is null or new.location is null or lower(new.location) like '%'||lower(s.location)||'%')
    and (s.minimum_age is null or new.maximum_age is null or new.maximum_age>=s.minimum_age)
    and (s.maximum_age is null or new.minimum_age is null or new.minimum_age<=s.maximum_age)
    and not exists (
      select 1 from public.notifications n
      where n.user_id=s.athlete_id and n.target_path='/opportunities/'||new.id
        and n.notification_type='saved_search_alert'
        and n.created_at > now()-interval '7 days'
    );

  insert into public.notifications(user_id,notification_type,title,body,target_path)
  select distinct ap.user_id,'opportunity_recommendation','A new opportunity may fit your profile',
    '“'||new.title||'” is relevant to the sport, discipline or level on your profile.','/opportunities/'||new.id
  from public.athlete_profiles ap
  join public.profiles p on p.id=ap.user_id and p.account_type='athlete'
  left join public.sports athlete_sport on athlete_sport.id=ap.primary_sport_id
  where ap.visibility='public'
    and (
      (sport_name is not null and athlete_sport.name=sport_name)
      or (new.discipline is not null and ap.discipline is not null and ap.discipline ilike '%'||new.discipline||'%')
      or (new.positions && case when ap.position is null then '{}'::text[] else array[ap.position] end)
      or (new.competition_level is not null and ap.playing_level is not null and ap.playing_level ilike '%'||new.competition_level||'%')
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id=ap.user_id and n.target_path='/opportunities/'||new.id
        and n.notification_type='opportunity_recommendation'
        and n.created_at > now()-interval '7 days'
    );
  return new;
end;
$$;

revoke all on function private.notify_matching_athletes() from public, anon, authenticated;
drop trigger if exists notify_matching_athletes_after_opportunity on public.opportunities;
create trigger notify_matching_athletes_after_opportunity
  after insert or update of status, verification_status on public.opportunities
  for each row execute function private.notify_matching_athletes();

comment on table public.opportunity_applications is 'Applications retain explicit CV consent timestamp and a point-in-time application snapshot so recruiter review is stable and auditable.';
comment on table public.saved_opportunity_searches is 'Athlete-owned searches that can generate alerts when matching opportunities are published.';
comment on table public.opportunity_match_events is 'Explainable opportunity-to-athlete ranking records visible to the owning organisation.';
