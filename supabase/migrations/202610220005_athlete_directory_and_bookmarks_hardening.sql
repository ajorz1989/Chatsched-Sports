-- Tighten athlete-specific tables and public directories to genuine athlete accounts.
-- This is an additive hardening migration; apply after migrations 001-004.

alter table public.athlete_profiles alter column visibility set default 'private';

drop policy if exists "Members can create their own athlete profile" on public.athlete_profiles;
create policy "Athletes can create their own athlete profile"
  on public.athlete_profiles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  );

drop policy if exists "Members can update their own athlete profile" on public.athlete_profiles;
create policy "Athletes can update their own athlete profile"
  on public.athlete_profiles for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  );

drop policy if exists "Members can add their own achievements" on public.athlete_achievements;
create policy "Athletes can add their own achievements"
  on public.athlete_achievements for insert to authenticated
  with check (
    athlete_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  );

drop policy if exists "Members can update their own achievements" on public.athlete_achievements;
create policy "Athletes can update their own achievements"
  on public.athlete_achievements for update to authenticated
  using (
    athlete_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  )
  with check (
    athlete_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  );

drop policy if exists "Athletes manage their own media" on public.athlete_media;
create policy "Athletes manage their own media"
  on public.athlete_media for insert to authenticated
  with check (
    athlete_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  );

drop policy if exists "Athletes update their own media" on public.athlete_media;
create policy "Athletes update their own media"
  on public.athlete_media for update to authenticated
  using (
    athlete_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  )
  with check (
    athlete_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_type = 'athlete'
    )
  );

create or replace view public.member_directory
with (security_barrier = true)
as
select
  p.id,
  p.display_name,
  p.avatar_url,
  coalesce(ap.location, p.location) as location,
  p.country,
  p.account_type,
  sp.name as primary_sport,
  ap.position,
  ap.playing_level
from public.profiles p
left join public.athlete_profiles ap
  on ap.user_id = p.id
 and p.account_type = 'athlete'
 and ap.visibility = 'public'
left join public.sports sp on sp.id = ap.primary_sport_id and sp.is_active = true
where (p.account_type = 'athlete' and ap.user_id is not null)
   or exists (
     select 1 from public.organisations o
     where o.owner_id = p.id and o.verification_status = 'verified'
   )
   or exists (
     select 1
     from public.opportunity_applications application
     join public.opportunities opportunity on opportunity.id = application.opportunity_id
     join public.organisations organisation on organisation.id = opportunity.organisation_id
     where (application.athlete_id = p.id and organisation.owner_id = (select auth.uid()))
        or (organisation.owner_id = p.id and application.athlete_id = (select auth.uid()))
   );

create or replace view public.athlete_directory
with (security_barrier = true)
as
select
  p.id,
  p.display_name,
  p.avatar_url,
  coalesce(ap.location, p.location) as location,
  p.country,
  sp.name as sport,
  ap.discipline,
  ap.position,
  ap.playing_level,
  ap.availability,
  ap.career_goals,
  ap.highlight_video_url
from public.profiles p
join public.athlete_profiles ap on ap.user_id = p.id and ap.visibility = 'public'
left join public.sports sp on sp.id = ap.primary_sport_id and sp.is_active = true
where p.account_type = 'athlete';

create or replace view public.opportunity_applicant_directory
with (security_barrier = true)
as
select
  p.id,
  p.display_name,
  p.avatar_url,
  coalesce(ap.location, p.location) as location,
  p.country,
  sp.name as sport,
  ap.discipline,
  ap.position,
  ap.playing_level,
  ap.visibility
from public.profiles p
left join public.athlete_profiles ap on ap.user_id = p.id
left join public.sports sp on sp.id = ap.primary_sport_id and sp.is_active = true
where p.account_type = 'athlete'
  and exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id = application.opportunity_id
    join public.organisations organisation on organisation.id = opportunity.organisation_id
    where application.athlete_id = p.id
      and organisation.owner_id = (select auth.uid())
  );

drop policy if exists "Athletes can save verified published opportunities" on public.saved_opportunities;
create policy "Athletes can save verified published opportunities"
  on public.saved_opportunities for insert to authenticated
  with check (
    athlete_id = (select auth.uid())
    and exists (
      select 1 from public.profiles member
      where member.id = (select auth.uid()) and member.account_type = 'athlete'
    )
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

comment on view public.member_directory is
  'Restricted directory of explicitly public athletes, verified organisation owners, and application-related participants; excludes email and private contact fields.';
comment on view public.athlete_directory is
  'Public directory of opted-in accounts whose account type is athlete; excludes email and private contact details.';
comment on view public.opportunity_applicant_directory is
  'Limited fields for actual athlete applicants, visible only to owners of opportunities they applied to.';
