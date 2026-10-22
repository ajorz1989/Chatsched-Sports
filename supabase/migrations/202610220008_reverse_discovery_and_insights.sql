-- ChatSched Sport reverse discovery and organisation insights.
-- Apply after migrations 001-007 in the dedicated Sport Supabase project.

create table if not exists public.talent_shortlists (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  note text check (note is null or length(trim(note)) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, athlete_id)
);

create index if not exists talent_shortlists_org_idx
  on public.talent_shortlists(organisation_id, created_at desc);
create index if not exists talent_shortlists_athlete_idx
  on public.talent_shortlists(athlete_id, created_at desc);

create table if not exists public.opportunity_member_views (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create unique index if not exists one_member_view_per_opportunity_per_day
  on public.opportunity_member_views(opportunity_id, viewer_id, (date(viewed_at)));
create index if not exists opportunity_member_views_opportunity_idx
  on public.opportunity_member_views(opportunity_id, viewed_at desc);

alter table public.talent_shortlists enable row level security;
alter table public.opportunity_member_views enable row level security;

create policy "Verified organisation owners can read their shortlists"
  on public.talent_shortlists for select to authenticated
  using (
    exists (
      select 1 from public.organisations o
      where o.id = organisation_id
        and o.owner_id = (select auth.uid())
        and o.verification_status = 'verified'
    )
    or private.is_sport_admin()
  );

create policy "Verified organisation owners can create shortlists"
  on public.talent_shortlists for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.organisations o
      where o.id = organisation_id
        and o.owner_id = (select auth.uid())
        and o.verification_status = 'verified'
    )
    and exists (
      select 1 from public.athlete_profiles ap
      join public.profiles p on p.id = ap.user_id
      where ap.user_id = athlete_id
        and ap.visibility = 'public'
        and p.account_type = 'athlete'
    )
  );

create policy "Verified organisation owners can update their shortlists"
  on public.talent_shortlists for update to authenticated
  using (
    exists (
      select 1 from public.organisations o
      where o.id = organisation_id
        and o.owner_id = (select auth.uid())
        and o.verification_status = 'verified'
    )
    or private.is_sport_admin()
  )
  with check (
    exists (
      select 1 from public.organisations o
      where o.id = organisation_id
        and o.owner_id = (select auth.uid())
        and o.verification_status = 'verified'
    )
    or private.is_sport_admin()
  );

create policy "Verified organisation owners can delete their shortlists"
  on public.talent_shortlists for delete to authenticated
  using (
    exists (
      select 1 from public.organisations o
      where o.id = organisation_id
        and o.owner_id = (select auth.uid())
        and o.verification_status = 'verified'
    )
    or private.is_sport_admin()
  );

create policy "Members can insert their own opportunity views"
  on public.opportunity_member_views for insert to authenticated
  with check (
    viewer_id = (select auth.uid())
    and exists (
      select 1
      from public.opportunities p
      join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id
        and p.status = 'published'
        and p.verification_status = 'verified'
        and o.verification_status = 'verified'
    )
  );

create policy "Organisation owners can read their opportunity views"
  on public.opportunity_member_views for select to authenticated
  using (
    exists (
      select 1
      from public.opportunities p
      join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id
        and o.owner_id = (select auth.uid())
    )
    or private.is_sport_admin()
  );

grant select, insert, update, delete on public.talent_shortlists to authenticated;
grant insert on public.opportunity_member_views to authenticated;
grant select on public.opportunity_member_views to authenticated;

comment on table public.talent_shortlists is 'Private shortlist records owned by verified organisations; athletes are not exposed to private notes.';
comment on table public.opportunity_member_views is 'Authenticated member view telemetry for organisation insights; no IP or anonymous fingerprint is stored.';
