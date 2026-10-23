-- Phase 2: trust, references, endorsements and safety reporting.
create table if not exists public.athlete_references (
 id uuid primary key default gen_random_uuid(),
 athlete_id uuid not null references public.profiles(id) on delete cascade,
 referee_id uuid not null references public.profiles(id) on delete restrict,
 organisation_id uuid references public.organisations(id) on delete set null,
 relationship_title text not null check(length(trim(relationship_title)) between 2 and 120),
 organisation_name text,
 sport text,
 playing_period text,
 reference_text text not null check(length(trim(reference_text)) between 40 and 2500),
 status text not null default 'pending' check(status in ('pending','approved','rejected','withdrawn')),
 verified_by uuid references public.profiles(id) on delete set null,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(athlete_id,referee_id,relationship_title,organisation_name)
);
create index if not exists athlete_references_athlete_idx on public.athlete_references(athlete_id,status,created_at desc);
alter table public.athlete_references enable row level security;
create policy "Reference participants can read their references" on public.athlete_references for select to authenticated using(athlete_id=(select auth.uid()) or referee_id=(select auth.uid()) or status='approved' or private.is_sport_admin());
create policy "Athletes request references" on public.athlete_references for insert to authenticated with check(athlete_id=(select auth.uid()) and athlete_id<>referee_id);
create policy "Reference participants update" on public.athlete_references for update to authenticated using(athlete_id=(select auth.uid()) or referee_id=(select auth.uid()) or private.is_sport_admin()) with check(athlete_id=(select auth.uid()) or referee_id=(select auth.uid()) or private.is_sport_admin());
grant select,insert,update on public.athlete_references to authenticated;

-- A reference request is created by the athlete; the named referee can complete it after signing in.
create table if not exists public.athlete_reference_requests (
 id uuid primary key default gen_random_uuid(),
 athlete_id uuid not null references public.profiles(id) on delete cascade,
 referee_id uuid references public.profiles(id) on delete set null,
 referee_email text,
 relationship_title text not null,
 organisation_name text,
 sport text,
 playing_period text,
 message text,
 status text not null default 'requested' check(status in ('requested','accepted','declined','completed','cancelled')),
 reference_id uuid references public.athlete_references(id) on delete set null,
 created_at timestamptz not null default now(),
 completed_at timestamptz
);
create index if not exists athlete_reference_requests_athlete_idx on public.athlete_reference_requests(athlete_id,created_at desc);
alter table public.athlete_reference_requests enable row level security;
create policy "Athletes manage reference requests" on public.athlete_reference_requests for select to authenticated using(athlete_id=(select auth.uid()) or referee_id=(select auth.uid()) or private.is_sport_admin());
create policy "Athletes create reference requests" on public.athlete_reference_requests for insert to authenticated with check(athlete_id=(select auth.uid()));
create policy "Participants update reference requests" on public.athlete_reference_requests for update to authenticated using(athlete_id=(select auth.uid()) or referee_id=(select auth.uid()) or private.is_sport_admin()) with check(athlete_id=(select auth.uid()) or referee_id=(select auth.uid()) or private.is_sport_admin());
grant select,insert,update on public.athlete_reference_requests to authenticated;

-- Platform safety reports: private to the reporter and authorised administrators.
create table if not exists public.sport_safety_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 target_type text not null check(target_type in ('athlete','organisation','opportunity','message','trial','other')),
 target_id uuid,
 category text not null check(category in ('fake_profile','fake_opportunity','harassment','payment_request','privacy','minor_safety','fraud','spam','other')),
 description text not null check(length(trim(description)) between 10 and 4000),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 admin_notes text,
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists sport_safety_reports_status_idx on public.sport_safety_reports(status,priority,created_at desc);
alter table public.sport_safety_reports enable row level security;
create policy "Reporters read own safety reports" on public.sport_safety_reports for select to authenticated using(reporter_id=(select auth.uid()) or private.is_sport_admin());
create policy "Members submit safety reports" on public.sport_safety_reports for insert to authenticated with check(reporter_id=(select auth.uid()));
create policy "Admins manage safety reports" on public.sport_safety_reports for update to authenticated using(private.is_sport_admin()) with check(private.is_sport_admin());
grant select,insert,update on public.sport_safety_reports to authenticated;

-- Explainable trust score for organisations; it is a platform signal, not an endorsement.
create or replace function public.organisation_trust_score(target_organisation uuid)
returns table(score integer, verification boolean, completed_signals integer, open_reports integer)
language sql security invoker set search_path=public
as $$
 with org as (
  select verification_status='verified' as verified from public.organisations where id=target_organisation
 ), completed as (
  select count(*)::integer total from public.opportunities where organisation_id=target_organisation and status='closed' and verification_status='verified'
 ), reports as (
  select count(*)::integer total from public.sport_safety_reports where target_type='organisation' and target_id=target_organisation and status in ('open','reviewing')
 )
 select greatest(0,least(100,(case when (select verified from org) then 70 else 25 end)+least(20,(select total from completed)*2)-least(35,(select total from reports)*10)))::integer,
        coalesce((select verified from org),false),
        (select total from completed),
        (select total from reports);
$$;
revoke all on function public.organisation_trust_score(uuid) from public,anon;
grant execute on function public.organisation_trust_score(uuid) to authenticated;
