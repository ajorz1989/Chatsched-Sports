-- Final privacy hardening for public athlete surfaces and external links.
-- Apply after migrations 001-006 in the dedicated Sport Supabase project.

drop policy if exists "Public athlete profiles and their owners are readable" on public.athlete_profiles;
create policy "Public athlete profiles require athlete account and opt-in"
  on public.athlete_profiles for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (
      visibility = 'public'
      and exists (
        select 1 from public.profiles p
        where p.id = user_id and p.account_type = 'athlete'
      )
    )
  );

drop policy if exists "Achievements follow public athlete visibility" on public.athlete_achievements;
create policy "Achievements follow opted-in athlete visibility"
  on public.athlete_achievements for select to anon, authenticated
  using (
    athlete_id = (select auth.uid())
    or exists (
      select 1
      from public.athlete_profiles ap
      join public.profiles p on p.id = ap.user_id
      where ap.user_id = athlete_id
        and ap.visibility = 'public'
        and p.account_type = 'athlete'
    )
  );

drop policy if exists "Public media follows athlete profile visibility" on public.athlete_media;
create policy "Public media follows opted-in athlete visibility"
  on public.athlete_media for select to anon, authenticated
  using (
    athlete_id = (select auth.uid())
    or (
      is_public
      and exists (
        select 1
        from public.athlete_profiles ap
        join public.profiles p on p.id = ap.user_id
        where ap.user_id = athlete_id
          and ap.visibility = 'public'
          and p.account_type = 'athlete'
      )
    )
  );

-- Client forms validate HTTPS, but database constraints also reject unsafe schemes.
-- NOT VALID avoids blocking an installation due to historical values; any future
-- insert/update must satisfy the check. Existing legacy records can be reviewed separately.
alter table public.organisations
  drop constraint if exists organisations_website_https_check;
alter table public.organisations
  add constraint organisations_website_https_check
  check (website is null or website ~* '^https://') not valid;

alter table public.athlete_media
  drop constraint if exists athlete_media_url_https_check;
alter table public.athlete_media
  add constraint athlete_media_url_https_check
  check (url ~* '^https://') not valid;

alter table public.athlete_statistics
  drop constraint if exists athlete_statistics_evidence_url_https_check;
alter table public.athlete_statistics
  add constraint athlete_statistics_evidence_url_https_check
  check (evidence_url is null or evidence_url ~* '^https://') not valid;

alter table public.athlete_experience
  drop constraint if exists athlete_experience_source_url_https_check;
alter table public.athlete_experience
  add constraint athlete_experience_source_url_https_check
  check (source_url is null or source_url ~* '^https://') not valid;

comment on policy "Public athlete profiles require athlete account and opt-in" on public.athlete_profiles is
  'Public athlete-profile reads require the actual athlete account type and explicit public visibility.';
comment on policy "Public media follows opted-in athlete visibility" on public.athlete_media is
  'Public portfolio links are visible only for opted-in athlete accounts; owners can still see their own private items.';
