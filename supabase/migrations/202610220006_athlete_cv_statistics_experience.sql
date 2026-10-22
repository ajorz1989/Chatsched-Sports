-- Athlete portfolio enhancements: user-submitted statistics and playing experience.
-- Values remain self-reported; do not present them as verified performance claims.

create table if not exists public.athlete_statistics (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  sport_id uuid references public.sports(id) on delete set null,
  metric_name text not null check (length(trim(metric_name)) between 2 and 80),
  metric_value text not null check (length(trim(metric_value)) between 1 and 100),
  metric_unit text check (metric_unit is null or length(trim(metric_unit)) <= 30),
  season text check (season is null or length(trim(season)) <= 80),
  competition_name text check (competition_name is null or length(trim(competition_name)) <= 160),
  evidence_url text check (evidence_url is null or evidence_url ~* '^https://'),
  notes text check (notes is null or length(trim(notes)) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists athlete_statistics_owner_idx
  on public.athlete_statistics(athlete_id, created_at desc);

create table if not exists public.athlete_experience (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  organisation_name text not null check (length(trim(organisation_name)) between 2 and 160),
  role_title text not null check (length(trim(role_title)) between 2 and 120),
  sport_id uuid references public.sports(id) on delete set null,
  competition_level text check (competition_level is null or length(trim(competition_level)) <= 100),
  start_date date,
  end_date date,
  is_current boolean not null default false,
  is_public boolean not null default true,
  description text check (description is null or length(trim(description)) <= 2000),
  source_url text check (source_url is null or source_url ~* '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_current = false or end_date is null),
  check (start_date is null or end_date is null or end_date >= start_date)
);
create index if not exists athlete_experience_owner_idx
  on public.athlete_experience(athlete_id, start_date desc);

alter table public.athlete_statistics enable row level security;
alter table public.athlete_experience enable row level security;

create policy "Statistics follow athlete profile privacy"
  on public.athlete_statistics for select to anon, authenticated
  using (
    athlete_id = (select auth.uid())
    or exists (
      select 1 from public.athlete_profiles ap
      join public.profiles p on p.id = ap.user_id
      where ap.user_id = athlete_id
        and ap.visibility = 'public'
        and p.account_type = 'athlete'
    )
  );
create policy "Athletes create their own statistics"
  on public.athlete_statistics for insert to authenticated
  with check (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  );
create policy "Athletes update their own statistics"
  on public.athlete_statistics for update to authenticated
  using (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  )
  with check (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  );
create policy "Athletes delete their own statistics"
  on public.athlete_statistics for delete to authenticated
  using (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  );

create policy "Experience follows per-entry and athlete privacy"
  on public.athlete_experience for select to anon, authenticated
  using (
    athlete_id = (select auth.uid())
    or (
      is_public
      and exists (
        select 1 from public.athlete_profiles ap
        join public.profiles p on p.id = ap.user_id
        where ap.user_id = athlete_id
          and ap.visibility = 'public'
          and p.account_type = 'athlete'
      )
    )
  );
create policy "Athletes create their own experience"
  on public.athlete_experience for insert to authenticated
  with check (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  );
create policy "Athletes update their own experience"
  on public.athlete_experience for update to authenticated
  using (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  )
  with check (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  );
create policy "Athletes delete their own experience"
  on public.athlete_experience for delete to authenticated
  using (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'athlete')
  );

grant select on public.athlete_statistics to anon, authenticated;
grant insert (athlete_id, sport_id, metric_name, metric_value, metric_unit, season, competition_name, evidence_url, notes) on public.athlete_statistics to authenticated;
grant update (sport_id, metric_name, metric_value, metric_unit, season, competition_name, evidence_url, notes, updated_at) on public.athlete_statistics to authenticated;
grant delete on public.athlete_statistics to authenticated;

grant select on public.athlete_experience to anon, authenticated;
grant insert (athlete_id, organisation_name, role_title, sport_id, competition_level, start_date, end_date, is_current, is_public, description, source_url) on public.athlete_experience to authenticated;
grant update (organisation_name, role_title, sport_id, competition_level, start_date, end_date, is_current, is_public, description, source_url, updated_at) on public.athlete_experience to authenticated;
grant delete on public.athlete_experience to authenticated;

comment on table public.athlete_statistics is 'Athlete-submitted performance information. Data is not independently verified unless a future review workflow says otherwise.';
comment on table public.athlete_experience is 'Athlete-submitted team, academy and career experience. Each item respects both its own visibility and the parent profile privacy.';
