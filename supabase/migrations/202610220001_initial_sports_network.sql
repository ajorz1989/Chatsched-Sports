-- ChatSched Sport initial schema. Apply only to a NEW Sport Supabase project.
-- Never run this migration on the existing ChatSched advertising database.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  account_type text not null default 'athlete'
    check (account_type in ('athlete','club','scout','academy','coach','brand','sponsor','agent','event')),
  avatar_url text,
  location text,
  country text default 'South Africa',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  organisation_type text not null check (organisation_type in ('club','academy','scout','coach','brand','sponsor','agent','event','school','other')),
  description text,
  website text,
  location text,
  country text not null default 'South Africa',
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.athlete_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  primary_sport_id uuid references public.sports(id) on delete set null,
  discipline text,
  position text,
  playing_level text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  availability text,
  location text,
  career_goals text,
  highlight_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.athlete_achievements (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organisation_name text,
  achievement_date date,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  opportunity_type text not null check (opportunity_type in ('trial','academy','scholarship','scouting','sponsorship','coaching','event','development')),
  sport_id uuid references public.sports(id) on delete set null,
  discipline text,
  positions text[] not null default '{}',
  location text,
  country text not null default 'South Africa',
  competition_level text,
  summary text not null,
  description text,
  eligibility text,
  closing_date date,
  compensation_type text,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','shortlisted','declined','withdrawn','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, athlete_id)
);

create table if not exists public.saved_opportunities (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (athlete_id, opportunity_id)
);

create index if not exists organisations_owner_idx on public.organisations(owner_id);
create index if not exists organisations_verification_idx on public.organisations(verification_status);
create index if not exists athlete_profiles_sport_idx on public.athlete_profiles(primary_sport_id);
create index if not exists athlete_profiles_visibility_idx on public.athlete_profiles(visibility);
create index if not exists opportunities_feed_idx on public.opportunities(status, verification_status, created_at desc);
create index if not exists opportunities_sport_idx on public.opportunities(sport_id);
create index if not exists applications_athlete_idx on public.opportunity_applications(athlete_id, created_at desc);
create index if not exists applications_opportunity_idx on public.opportunity_applications(opportunity_id, created_at desc);

insert into public.sports (name, slug) values
  ('Football','football'), ('Rugby','rugby'), ('Cricket','cricket'), ('Basketball','basketball'),
  ('Athletics','athletics'), ('Swimming','swimming'), ('Netball','netball'), ('Hockey','hockey'),
  ('Tennis','tennis'), ('Boxing','boxing'), ('Cycling','cycling'), ('Golf','golf'),
  ('Esports','esports'), ('Other','other')
on conflict (slug) do nothing;

-- Keep the privileged auth trigger handler outside the exposed public API schema.
-- account_type is self-declared and never provides administrative permission.
create schema if not exists private;
revoke all on schema private from PUBLIC, anon, authenticated;

create or replace function private.handle_new_sports_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $sports$
declare
  requested_type text;
begin
  requested_type := new.raw_user_meta_data ->> 'account_type';
  if requested_type is null or requested_type not in ('athlete','club','scout','academy','coach','brand','sponsor','agent','event') then
    requested_type := 'athlete';
  end if;

  insert into public.profiles (id, email, display_name, account_type)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    requested_type
  )
  on conflict (id) do nothing;

  return new;
end;
$sports$;

drop trigger if exists on_auth_user_created_sports_profile on auth.users;
create trigger on_auth_user_created_sports_profile
  after insert on auth.users
  for each row execute procedure private.handle_new_sports_user();
revoke all on function private.handle_new_sports_user() from PUBLIC, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.organisations enable row level security;
alter table public.athlete_profiles enable row level security;
alter table public.athlete_achievements enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_applications enable row level security;
alter table public.saved_opportunities enable row level security;

create policy "Members can read their own profile"
  on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Members can update their own profile"
  on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Sports catalogue is readable"
  on public.sports for select to anon, authenticated using (is_active = true);

create policy "Organisations are visible to owner or when verified"
  on public.organisations for select to anon, authenticated using (verification_status = 'verified' or owner_id = (select auth.uid()));
create policy "Members can create their own organisation"
  on public.organisations for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners can update their organisation"
  on public.organisations for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners can delete their organisation"
  on public.organisations for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Public athlete profiles and their owners are readable"
  on public.athlete_profiles for select to anon, authenticated using (visibility = 'public' or user_id = (select auth.uid()));
create policy "Members can create their own athlete profile"
  on public.athlete_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members can update their own athlete profile"
  on public.athlete_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members can delete their own athlete profile"
  on public.athlete_profiles for delete to authenticated using (user_id = (select auth.uid()));

create policy "Achievements follow public athlete visibility"
  on public.athlete_achievements for select to anon, authenticated using (
    athlete_id = (select auth.uid()) or exists (
      select 1 from public.athlete_profiles ap where ap.user_id = athlete_id and ap.visibility = 'public'
    )
  );
create policy "Members can add their own achievements"
  on public.athlete_achievements for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy "Members can update their own achievements"
  on public.athlete_achievements for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create policy "Members can delete their own achievements"
  on public.athlete_achievements for delete to authenticated using (athlete_id = (select auth.uid()));

create policy "Verified published opportunities are public"
  on public.opportunities for select to anon, authenticated using (
    (status = 'published' and verification_status = 'verified' and exists (
      select 1 from public.organisations public_org
      where public_org.id = organisation_id and public_org.verification_status = 'verified'
    ))
    or exists (select 1 from public.organisations o where o.id = organisation_id and o.owner_id = (select auth.uid()))
  );
create policy "Organisation owners can create opportunities"
  on public.opportunities for insert to authenticated with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.organisations o where o.id = organisation_id and o.owner_id = (select auth.uid())
    )
  );
create policy "Organisation owners can update opportunities"
  on public.opportunities for update to authenticated using (
    exists (select 1 from public.organisations o where o.id = organisation_id and o.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.organisations o where o.id = organisation_id and o.owner_id = (select auth.uid()))
  );
create policy "Organisation owners can delete opportunities"
  on public.opportunities for delete to authenticated using (
    exists (select 1 from public.organisations o where o.id = organisation_id and o.owner_id = (select auth.uid()))
  );

create policy "Athletes and organisation owners can view applications"
  on public.opportunity_applications for select to authenticated using (
    athlete_id = (select auth.uid()) or exists (
      select 1 from public.opportunities p join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id and o.owner_id = (select auth.uid())
    )
  );
create policy "Athletes can apply to verified published opportunities"
  on public.opportunity_applications for insert to authenticated with check (
    athlete_id = (select auth.uid()) and exists (
      select 1 from public.opportunities p
      join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id and p.status = 'published' and p.verification_status = 'verified'
        and o.verification_status = 'verified'
        and (p.closing_date is null or p.closing_date >= current_date)
    )
  );
create policy "Athletes can withdraw their own applications"
  on public.opportunity_applications for delete to authenticated using (athlete_id = (select auth.uid()));
create policy "Organisation owners can update application status"
  on public.opportunity_applications for update to authenticated using (
    exists (select 1 from public.opportunities p join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id and o.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.opportunities p join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id and o.owner_id = (select auth.uid()))
  );

create policy "Saved opportunities are private to their athlete"
  on public.saved_opportunities for select to authenticated using (athlete_id = (select auth.uid()));
create policy "Athletes can save verified published opportunities"
  on public.saved_opportunities for insert to authenticated with check (
    athlete_id = (select auth.uid()) and exists (
      select 1 from public.opportunities p
      join public.organisations o on o.id = p.organisation_id
      where p.id = opportunity_id and p.status = 'published' and p.verification_status = 'verified'
        and o.verification_status = 'verified'
    )
  );
create policy "Athletes can remove their saved opportunities"
  on public.saved_opportunities for delete to authenticated using (athlete_id = (select auth.uid()));

-- Explicit grants prevent ordinary members from editing verification and ownership fields.
revoke all on public.profiles, public.sports, public.organisations, public.athlete_profiles,
  public.athlete_achievements, public.opportunities, public.opportunity_applications,
  public.saved_opportunities from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, location, country, bio, updated_at) on public.profiles to authenticated;
grant select on public.sports to anon, authenticated;

grant select on public.organisations to anon, authenticated;
grant insert (owner_id, name, organisation_type, description, website, location, country) on public.organisations to authenticated;
grant update (name, organisation_type, description, website, location, country, updated_at) on public.organisations to authenticated;
grant delete on public.organisations to authenticated;

grant select on public.athlete_profiles to anon, authenticated;
grant insert (user_id, primary_sport_id, discipline, position, playing_level, visibility, availability, location, career_goals, highlight_video_url) on public.athlete_profiles to authenticated;
grant update (primary_sport_id, discipline, position, playing_level, visibility, availability, location, career_goals, highlight_video_url, updated_at) on public.athlete_profiles to authenticated;
grant delete on public.athlete_profiles to authenticated;

grant select on public.athlete_achievements to anon, authenticated;
grant insert (athlete_id, title, organisation_name, achievement_date, description) on public.athlete_achievements to authenticated;
grant update (title, organisation_name, achievement_date, description) on public.athlete_achievements to authenticated;
grant delete on public.athlete_achievements to authenticated;

grant select on public.opportunities to anon, authenticated;
grant insert (organisation_id, created_by, title, opportunity_type, sport_id, discipline, positions, location, country, competition_level, summary, description, eligibility, closing_date, compensation_type, status) on public.opportunities to authenticated;
grant update (title, opportunity_type, sport_id, discipline, positions, location, country, competition_level, summary, description, eligibility, closing_date, compensation_type, status, updated_at) on public.opportunities to authenticated;
grant delete on public.opportunities to authenticated;

grant select on public.opportunity_applications to authenticated;
grant insert (opportunity_id, athlete_id, message) on public.opportunity_applications to authenticated;
grant update (status, updated_at) on public.opportunity_applications to authenticated;
grant delete on public.opportunity_applications to authenticated;

grant select on public.saved_opportunities to authenticated;
grant insert (athlete_id, opportunity_id) on public.saved_opportunities to authenticated;
grant delete on public.saved_opportunities to authenticated;

comment on table public.opportunities is 'Only published, platform-verified opportunities are public. Ordinary members cannot write verification_status.';
comment on table public.athlete_profiles is 'Contains profile fields intended for public display plus visibility controls; contact details belong in private profile fields.';
comment on column public.profiles.account_type is 'Self-declared account category, never an administrator permission.';
