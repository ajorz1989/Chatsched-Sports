-- ChatSched Sport premium athlete documents, consented analytics, agency CRM and club trial-day management.
-- Apply only to the dedicated ChatSched Sport Supabase project.

alter table public.athlete_profiles
  add column if not exists profile_view_analytics_consent boolean not null default false,
  add column if not exists profile_view_analytics_consent_at timestamptz;

create table if not exists public.athlete_profile_views (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  source text not null default 'talent_directory',
  created_at timestamptz not null default now()
);
create index if not exists athlete_profile_views_athlete_idx on public.athlete_profile_views(athlete_id,created_at desc);
create index if not exists athlete_profile_views_viewer_idx on public.athlete_profile_views(viewer_id,created_at desc);
alter table public.athlete_profile_views enable row level security;
create policy "Athletes read their consented profile views"
  on public.athlete_profile_views for select to authenticated
  using (
    athlete_id=(select auth.uid())
    and exists(select 1 from public.athlete_profiles ap where ap.user_id=athlete_id and ap.profile_view_analytics_consent=true)
  );
create policy "Authenticated members record consented profile views"
  on public.athlete_profile_views for insert to authenticated
  with check (
    viewer_id=(select auth.uid())
    and exists(select 1 from public.athlete_profiles ap where ap.user_id=athlete_id and ap.visibility='public' and ap.profile_view_analytics_consent=true)
  );
grant select,insert on public.athlete_profile_views to authenticated;
grant update(profile_view_analytics_consent,profile_view_analytics_consent_at) on public.athlete_profiles to authenticated;

alter table public.career_support_requests
  add column if not exists pipeline_stage text not null default 'new',
  add column if not exists assigned_agent_id uuid references public.profiles(id) on delete set null,
  add column if not exists service_package text,
  add column if not exists fee_agreement_status text not null default 'not_offered',
  add column if not exists fee_amount_cents integer,
  add column if not exists fee_currency text not null default 'ZAR',
  add column if not exists fee_terms text,
  add column if not exists fee_agreement_at timestamptz,
  add column if not exists guardian_consent boolean not null default false,
  add column if not exists guardian_consent_at timestamptz,
  add constraint career_support_pipeline_stage_check check(pipeline_stage in ('new','qualified','consultation','proposal','active','won','lost','closed')),
  add constraint career_support_fee_status_check check(fee_agreement_status in ('not_offered','draft','accepted','declined','cancelled')),
  add constraint career_support_fee_amount_check check(fee_amount_cents is null or fee_amount_cents>=0);

create table if not exists public.career_support_case_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.career_support_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  note text not null check(length(trim(note)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists career_support_case_notes_request_idx on public.career_support_case_notes(request_id,created_at desc);
alter table public.career_support_case_notes enable row level security;
create policy "Assigned agents and admins read case notes"
  on public.career_support_case_notes for select to authenticated
  using (
    private.is_sport_admin()
    or exists(select 1 from public.career_support_requests r where r.id=request_id and r.assigned_agent_id=(select auth.uid()))
  );
create policy "Assigned agents and admins add case notes"
  on public.career_support_case_notes for insert to authenticated
  with check (
    author_id=(select auth.uid())
    and (
      private.is_sport_admin()
      or exists(select 1 from public.career_support_requests r where r.id=request_id and r.assigned_agent_id=(select auth.uid()))
    )
  );
grant select,insert on public.career_support_case_notes to authenticated;

create table if not exists public.career_service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  fee_amount_cents integer,
  fee_currency text not null default 'ZAR',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.career_service_packages enable row level security;
create policy "Members can view active service packages"
  on public.career_service_packages for select to authenticated using(active=true or private.is_sport_admin());
grant select on public.career_service_packages to authenticated;
insert into public.career_service_packages(name,description,fee_amount_cents) values
('Career Planning','Structured career planning and opportunity-readiness support.',null),
('Profile & CV Review','Review and improve an athlete profile, sports CV and media kit.',null),
('Trial Preparation','Preparation support for a specific trial or scouting process.',null),
('Representation Review','Initial assessment of a potential representation relationship; no representation is promised.',null)
on conflict(name) do nothing;

create table if not exists public.career_fee_agreements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.career_support_requests(id) on delete cascade,
  service_package_id uuid references public.career_service_packages(id) on delete set null,
  client_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.profiles(id) on delete restrict,
  amount_cents integer not null check(amount_cents>=0),
  currency text not null default 'ZAR',
  terms text not null check(length(trim(terms)) between 20 and 8000),
  status text not null default 'draft' check(status in ('draft','accepted','declined','cancelled')),
  client_accepted_at timestamptz,
  provider_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.career_fee_agreements enable row level security;
create policy "Fee agreement parties read their agreements"
 on public.career_fee_agreements for select to authenticated
 using(client_id=(select auth.uid()) or provider_id=(select auth.uid()) or private.is_sport_admin());
create policy "Admins create fee agreements"
 on public.career_fee_agreements for insert to authenticated
 with check(private.is_sport_admin());
create policy "Agreement parties update acceptance"
 on public.career_fee_agreements for update to authenticated
 using(client_id=(select auth.uid()) or provider_id=(select auth.uid()) or private.is_sport_admin())
 with check(client_id=(select auth.uid()) or provider_id=(select auth.uid()) or private.is_sport_admin());
grant select,insert,update on public.career_fee_agreements to authenticated;

create table if not exists public.sport_trial_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check(length(trim(title)) between 3 and 180),
  sport_id uuid references public.sports(id) on delete set null,
  discipline text,
  description text,
  venue text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check(capacity>0),
  slot_minutes integer not null default 30 check(slot_minutes between 10 and 240),
  status text not null default 'draft' check(status in ('draft','published','closed','cancelled')),
  price_cents integer not null default 0 check(price_cents>=0),
  currency text not null default 'ZAR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at>starts_at)
);
create index if not exists sport_trial_sessions_org_idx on public.sport_trial_sessions(organisation_id,starts_at desc);
create table if not exists public.sport_trial_slots (
  id uuid primary key default gen_random_uuid(),
  trial_session_id uuid not null references public.sport_trial_sessions(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check(capacity>0),
  unique(trial_session_id,starts_at),
  check(ends_at>starts_at)
);
create table if not exists public.sport_trial_rsvps (
  id uuid primary key default gen_random_uuid(),
  trial_session_id uuid not null references public.sport_trial_sessions(id) on delete cascade,
  slot_id uuid references public.sport_trial_slots(id) on delete set null,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'reserved' check(status in ('reserved','waitlisted','cancelled','checked_in','no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trial_session_id,athlete_id)
);
create index if not exists sport_trial_rsvps_session_idx on public.sport_trial_rsvps(trial_session_id,status);
create table if not exists public.sport_trial_results (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null unique references public.sport_trial_rsvps(id) on delete cascade,
  result_status text not null check(result_status in ('selected','shortlisted','follow_up','not_selected','pending')),
  score numeric(5,2),
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sport_trial_sessions enable row level security;
alter table public.sport_trial_slots enable row level security;
alter table public.sport_trial_rsvps enable row level security;
alter table public.sport_trial_results enable row level security;

create policy "Trial owners manage sessions"
 on public.sport_trial_sessions for all to authenticated
 using(exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) or private.is_sport_admin())
 with check(exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());
create policy "Public sees published trials"
 on public.sport_trial_sessions for select to anon,authenticated using(status='published' or exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());
create policy "Trial owners manage slots"
 on public.sport_trial_slots for all to authenticated
 using(exists(select 1 from public.sport_trial_sessions s join public.organisations o on o.id=s.organisation_id where s.id=trial_session_id and o.owner_id=(select auth.uid())) or private.is_sport_admin())
 with check(exists(select 1 from public.sport_trial_sessions s join public.organisations o on o.id=s.organisation_id where s.id=trial_session_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());
create policy "Athletes read published trial slots"
 on public.sport_trial_slots for select to authenticated using(exists(select 1 from public.sport_trial_sessions s where s.id=trial_session_id and s.status='published'));
create policy "Athletes RSVP to published trials"
 on public.sport_trial_rsvps for insert to authenticated
 with check(athlete_id=(select auth.uid()) and exists(select 1 from public.sport_trial_sessions s where s.id=trial_session_id and s.status='published'));
create policy "Athletes manage own RSVP"
 on public.sport_trial_rsvps for select to authenticated using(athlete_id=(select auth.uid()));
create policy "Athletes cancel own RSVP"
 on public.sport_trial_rsvps for update to authenticated using(athlete_id=(select auth.uid())) with check(athlete_id=(select auth.uid()));
create policy "Trial owners read RSVPs"
 on public.sport_trial_rsvps for select to authenticated using(exists(select 1 from public.sport_trial_sessions s join public.organisations o on o.id=s.organisation_id where s.id=trial_session_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());
create policy "Trial owners update RSVPs"
 on public.sport_trial_rsvps for update to authenticated using(exists(select 1 from public.sport_trial_sessions s join public.organisations o on o.id=s.organisation_id where s.id=trial_session_id and o.owner_id=(select auth.uid())) or private.is_sport_admin()) with check(exists(select 1 from public.sport_trial_sessions s join public.organisations o on o.id=s.organisation_id where s.id=trial_session_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());
create policy "Trial owners manage results"
 on public.sport_trial_results for all to authenticated using(exists(select 1 from public.sport_trial_rsvps r join public.sport_trial_sessions s on s.id=r.trial_session_id join public.organisations o on o.id=s.organisation_id where r.id=rsvp_id and o.owner_id=(select auth.uid())) or private.is_sport_admin()) with check(exists(select 1 from public.sport_trial_rsvps r join public.sport_trial_sessions s on s.id=r.trial_session_id join public.organisations o on o.id=s.organisation_id where r.id=rsvp_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());
grant select,insert,update on public.sport_trial_sessions to authenticated;
grant select,insert,update,delete on public.sport_trial_slots to authenticated;
grant select,insert,update on public.sport_trial_rsvps to authenticated;
grant select,insert,update on public.sport_trial_results to authenticated;

create or replace function public.reserve_trial_slot(target_slot uuid,target_session uuid)
returns uuid language plpgsql security invoker set search_path=public
as $$
declare
  slot_capacity integer;
  current_count integer;
  new_rsvp uuid;
begin
  if not exists(select 1 from public.sport_trial_sessions where id=target_session and status='published') then
    raise exception 'Trial session is not open for RSVP';
  end if;
  if not exists(select 1 from public.sport_trial_slots where id=target_slot and trial_session_id=target_session) then
    raise exception 'Trial slot not found';
  end if;
  select capacity into slot_capacity from public.sport_trial_slots where id=target_slot for update;
  select count(*) into current_count from public.sport_trial_rsvps where slot_id=target_slot and status in ('reserved','checked_in');
  if current_count>=slot_capacity then
    raise exception 'Trial slot is full';
  end if;
  insert into public.sport_trial_rsvps(trial_session_id,slot_id,athlete_id,status)
  values(target_session,target_slot,(select auth.uid()),'reserved')
  on conflict(trial_session_id,athlete_id) do update set slot_id=excluded.slot_id,status='reserved',updated_at=now()
  returning id into new_rsvp;
  return new_rsvp;
end; $$;
revoke all on function public.reserve_trial_slot(uuid,uuid) from public,anon;
grant execute on function public.reserve_trial_slot(uuid,uuid) to authenticated;

-- Keep payment deliberately disabled at database level until the commercial/legal configuration is approved.
comment on table public.career_fee_agreements is 'Fee agreements are records only; ChatSched Sport must not charge placement/representation fees until applicable sport-agent and consumer-law requirements are confirmed.';
comment on table public.sport_trial_sessions is 'Paid club trial-day infrastructure. Price fields support future checkout; publishing does not itself charge a club.';
