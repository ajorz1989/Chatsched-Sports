-- ChatSched Sport workspace expansion: media, messaging, notifications and controlled moderation.
-- Apply only to the dedicated ChatSched Sport Supabase project.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, supabase_auth_admin;

create table if not exists private.sport_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
revoke all on private.sport_admins from public, anon, authenticated;

create or replace function private.is_sport_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $admin$
  select exists (
    select 1 from private.sport_admins a
    where a.user_id = (select auth.uid())
  );
$admin$;
revoke all on function private.is_sport_admin() from public, anon;
grant execute on function private.is_sport_admin() to authenticated;

-- Small RPC used by the admin screen to show the correct gate message.
create or replace function public.is_sport_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $admin_rpc$
  select private.is_sport_admin();
$admin_rpc$;
revoke all on function public.is_sport_admin() from public, anon;
grant execute on function public.is_sport_admin() to authenticated;

create table if not exists public.athlete_media (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null check (media_type in ('photo','video','link','document')),
  title text not null,
  url text not null check (url ~* '^https://'),
  is_public boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists athlete_media_owner_idx on public.athlete_media(athlete_id, display_order);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (participant_a <> participant_b),
  check (participant_a < participant_b),
  unique(participant_a, participant_b)
);
create index if not exists conversations_participant_b_idx on public.conversations(participant_b, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at asc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null default 'general',
  title text not null,
  body text not null default '',
  target_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action_type text not null,
  target_type text not null,
  target_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_target_idx on public.admin_audit_log(target_type, target_id, created_at desc);

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  target_type text not null check (target_type in ('opportunity','organisation','athlete','message','other')),
  target_id uuid not null,
  reason text not null check (reason in ('fraud_or_scam','impersonation','harassment_or_abuse','unsafe_request','misleading_listing','privacy_concern','spam','other')),
  details text not null check (length(trim(details)) between 10 and 4000),
  status text not null default 'pending' check (status in ('pending','in_review','resolved','dismissed')),
  resolution text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists safety_reports_status_created_idx on public.safety_reports(status, created_at desc);
create index if not exists safety_reports_target_idx on public.safety_reports(target_type, target_id, created_at desc);
create index if not exists safety_reports_reporter_idx on public.safety_reports(reporter_id, created_at desc);

create table if not exists public.career_support_requests (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  service_type text not null check (service_type in ('representation','trial_support','career_planning','recruitment','sponsorship','international_pathway','profile_review','other')),
  goals text not null check (length(trim(goals)) between 10 and 4000),
  preferred_outcome text,
  consent_to_contact boolean not null default false check (consent_to_contact),
  status text not null default 'submitted' check (status in ('submitted','in_review','accepted','declined','closed')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists career_support_athlete_idx on public.career_support_requests(athlete_id, created_at desc);
create index if not exists career_support_status_idx on public.career_support_requests(status, created_at desc);


alter table public.athlete_media enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.safety_reports enable row level security;
alter table public.career_support_requests enable row level security;

create policy "Public media follows athlete profile visibility"
  on public.athlete_media for select to anon, authenticated
  using (
    (is_public and exists (
      select 1 from public.athlete_profiles ap
      where ap.user_id = athlete_id and ap.visibility = 'public'
    ))
    or athlete_id = (select auth.uid())
  );
create policy "Athletes manage their own media"
  on public.athlete_media for insert to authenticated
  with check (athlete_id = (select auth.uid()));
create policy "Athletes update their own media"
  on public.athlete_media for update to authenticated
  using (athlete_id = (select auth.uid()))
  with check (athlete_id = (select auth.uid()));
create policy "Athletes remove their own media"
  on public.athlete_media for delete to authenticated
  using (athlete_id = (select auth.uid()));

create policy "Conversation participants can read their conversations"
  on public.conversations for select to authenticated
  using (participant_a = (select auth.uid()) or participant_b = (select auth.uid()));
create policy "Participants can start conversations"
  on public.conversations for insert to authenticated
  with check (
    (participant_a = (select auth.uid()) or participant_b = (select auth.uid()))
    and participant_a <> participant_b
  );
create policy "Participants can update their conversation timestamp"
  on public.conversations for update to authenticated
  using (participant_a = (select auth.uid()) or participant_b = (select auth.uid()))
  with check (participant_a = (select auth.uid()) or participant_b = (select auth.uid()));

create policy "Conversation participants can read messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid())))
  ));
create policy "Conversation participants can send as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid())))
    )
  );
create policy "Participants can mark messages read"
  on public.messages for update to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid())))
  ))
  with check (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and ((c.participant_a = (select auth.uid())) or (c.participant_b = (select auth.uid())))
  ));

create policy "Members read their notifications"
  on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Members mark their notifications read"
  on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Sport admins read audit log"
  on public.admin_audit_log for select to authenticated using (private.is_sport_admin());
create policy "Sport admins add audit events"
  on public.admin_audit_log for insert to authenticated with check (private.is_sport_admin() and actor_id = (select auth.uid()));

create policy "Members can submit safety reports"
  on public.safety_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "Members can view their own safety reports"
  on public.safety_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "Sport admins can review safety reports"
  on public.safety_reports for select to authenticated
  using (private.is_sport_admin());
create policy "Sport admins can update safety reports"
  on public.safety_reports for update to authenticated
  using (private.is_sport_admin())
  with check (private.is_sport_admin());

create policy "Athletes can create their own career support requests"
  on public.career_support_requests for insert to authenticated
  with check (
    athlete_id = (select auth.uid())
    and consent_to_contact = true
    and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.account_type = 'athlete')
  );
create policy "Athletes can read their own career support requests"
  on public.career_support_requests for select to authenticated
  using (athlete_id = (select auth.uid()));
create policy "Sport admins can read career support requests"
  on public.career_support_requests for select to authenticated
  using (private.is_sport_admin());
create policy "Sport admins can update career support requests"
  on public.career_support_requests for update to authenticated
  using (private.is_sport_admin())
  with check (private.is_sport_admin());

-- Admins can review pending data; rows remain invisible to ordinary members unless
-- they own the organisation or the organisation has been verified.
create policy "Sport admins can review all profiles"
  on public.profiles for select to authenticated using (private.is_sport_admin());
create policy "Sport admins can review organisations"
  on public.organisations for select to authenticated using (private.is_sport_admin());
create policy "Sport admins can moderate organisations"
  on public.organisations for update to authenticated using (private.is_sport_admin()) with check (private.is_sport_admin());
create policy "Sport admins can review all opportunities"
  on public.opportunities for select to authenticated using (private.is_sport_admin());
create policy "Sport admins can moderate opportunities"
  on public.opportunities for update to authenticated using (private.is_sport_admin()) with check (private.is_sport_admin());
create policy "Sport admins can review applications"
  on public.opportunity_applications for select to authenticated using (private.is_sport_admin());
create policy "Sport admins can moderate applications"
  on public.opportunity_applications for update to authenticated using (private.is_sport_admin()) with check (private.is_sport_admin());

grant select on public.athlete_media to anon, authenticated;
grant insert (athlete_id, media_type, title, url, is_public, display_order) on public.athlete_media to authenticated;
grant update (media_type, title, url, is_public, display_order) on public.athlete_media to authenticated;
grant delete on public.athlete_media to authenticated;

grant select, insert on public.conversations to authenticated;
grant update (updated_at) on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select, insert on public.admin_audit_log to authenticated;
grant select, insert on public.safety_reports to authenticated;
grant update (status, resolution, reviewed_by, reviewed_at, updated_at) on public.safety_reports to authenticated;
grant select, insert on public.career_support_requests to authenticated;
grant update (status, admin_notes, reviewed_by, reviewed_at, updated_at) on public.career_support_requests to authenticated;
comment on table public.career_support_requests is 'Private requests for career guidance, trial support, representation and other services. Athletes see their own requests; only allow-listed Sport administrators can review or update them.';
comment on table public.safety_reports is 'Private safety-report submissions and moderated outcomes. Only the reporter and allow-listed Sport administrators can read reports.';

-- Verification columns require admin membership in a trigger as well as an RLS policy.
-- The column grants alone must never let a normal organisation owner self-verify.
create or replace function private.guard_verification_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $guard$
begin
  if new.verification_status is distinct from old.verification_status
     and not private.is_sport_admin() then
    raise exception 'Only a ChatSched Sport administrator can change verification status.';
  end if;
  return new;
end;
$guard$;
revoke all on function private.guard_verification_fields() from public, anon, authenticated;
grant usage on schema private to authenticated;
create trigger organisations_verification_guard
  before update of verification_status on public.organisations
  for each row execute function private.guard_verification_fields();
create trigger opportunities_verification_guard
  before update of verification_status on public.opportunities
  for each row execute function private.guard_verification_fields();

grant update (verification_status) on public.organisations to authenticated;
grant update (verification_status) on public.opportunities to authenticated;

comment on table private.sport_admins is 'Manually maintained administrator allow-list; do not derive admin access from self-declared profile metadata.';
comment on table public.admin_audit_log is 'Append-only record of platform moderation decisions; write actions should be paired with successful moderation updates.';
comment on table public.messages is 'Private conversation messages; visible only to the two authenticated participants.';

-- Notify an organisation owner when a new application arrives.
create or replace function private.notify_opportunity_owner_on_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $application_notice$
declare
  recipient_id uuid;
  listing_title text;
begin
  select organisation.owner_id, opportunity.title
  into recipient_id, listing_title
  from public.opportunities opportunity
  join public.organisations organisation on organisation.id = opportunity.organisation_id
  where opportunity.id = new.opportunity_id;

  if recipient_id is not null and recipient_id <> new.athlete_id then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (recipient_id, 'application', 'New opportunity application',
      'An athlete has applied to "' || coalesce(listing_title, 'your opportunity') || '".',
      '/workspace');
  end if;
  return new;
end;
$application_notice$;
revoke all on function private.notify_opportunity_owner_on_application() from public, anon, authenticated;
create trigger notify_organisation_after_application
  after insert on public.opportunity_applications
  for each row execute function private.notify_opportunity_owner_on_application();

-- Notify the applicant when an organisation/admin changes application status.
create or replace function private.notify_athlete_on_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $application_status_notice$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (new.athlete_id, 'application_status', 'Application status updated',
      'Your application status is now "' || new.status || '".',
      '/workspace');
  end if;
  return new;
end;
$application_status_notice$;
revoke all on function private.notify_athlete_on_application_status() from public, anon, authenticated;
create trigger notify_athlete_after_application_status
  after update of status on public.opportunity_applications
  for each row execute function private.notify_athlete_on_application_status();
 
create or replace function private.notify_admins_on_career_support_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $support_notice$
begin
  insert into public.notifications (user_id, notification_type, title, body, target_path)
  select administrator.user_id, 'career_support_request', 'New athlete support request',
    'A new request for "' || new.service_type || '" support is ready for review.',
    '/admin'
  from private.sport_admins administrator
  join public.profiles profile on profile.id = administrator.user_id;
  return new;
end;
$support_notice$;
revoke all on function private.notify_admins_on_career_support_request() from public, anon, authenticated;
create trigger notify_admins_after_career_support_request
  after insert on public.career_support_requests
  for each row execute function private.notify_admins_on_career_support_request();

create or replace function private.notify_athlete_on_career_support_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $support_status_notice$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (new.athlete_id, 'career_support_status', 'Career support request updated',
      'Your request status is now "' || new.status || '".',
      '/workspace');
  end if;
  return new;
end;
$support_status_notice$;
revoke all on function private.notify_athlete_on_career_support_status() from public, anon, authenticated;
create trigger notify_athlete_after_career_support_status
  after update of status on public.career_support_requests
  for each row execute function private.notify_athlete_on_career_support_status();



-- Expose only explicitly public athlete/member fields through directory views.
-- The views intentionally omit emails, private biography fields, and login metadata.
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
left join public.athlete_profiles ap on ap.user_id = p.id and ap.visibility = 'public'
left join public.sports sp on sp.id = ap.primary_sport_id and sp.is_active = true
where ap.user_id is not null
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
left join public.sports sp on sp.id = ap.primary_sport_id and sp.is_active = true;

grant select on public.member_directory to anon, authenticated;
grant select on public.athlete_directory to anon, authenticated;
comment on view public.member_directory is 'Public allow-listed fields for public athlete profiles and owners of verified organisations; never include email or private contact fields.';
comment on view public.athlete_directory is 'Athlete-only public directory; constrained by explicit public profile visibility and excludes private contact fields.';

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
where exists (
  select 1
  from public.opportunity_applications application
  join public.opportunities opportunity on opportunity.id = application.opportunity_id
  join public.organisations organisation on organisation.id = opportunity.organisation_id
  where application.athlete_id = p.id
    and organisation.owner_id = (select auth.uid())
);

grant select on public.opportunity_applicant_directory to authenticated;
comment on view public.opportunity_applicant_directory is 'Limited applicant details only for owners of the opportunities that athlete applied to; no email or private contact fields.';


-- Public visibility must be an explicit athlete choice; make the privacy-first default consistent.
alter table public.athlete_profiles alter column visibility set default 'private';

-- The database, not only the UI, limits new conversations to discoverable public members.
drop policy if exists "Participants can start conversations" on public.conversations;
create policy "Only discoverable members can start conversations"
  on public.conversations for insert to authenticated
  with check (
    (participant_a = (select auth.uid()) or participant_b = (select auth.uid()))
    and participant_a <> participant_b
    and exists (
      select 1 from public.member_directory m
      where m.id = case
        when participant_a = (select auth.uid()) then participant_b
        else participant_a
      end
    )
  );


-- Notify the other participant on an inserted message; message sender cannot pick the recipient.
create or replace function private.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $notification$
declare
  recipient_id uuid;
begin
  select case
    when c.participant_a = new.sender_id then c.participant_b
    else c.participant_a
  end
  into recipient_id
  from public.conversations c
  where c.id = new.conversation_id
    and (c.participant_a = new.sender_id or c.participant_b = new.sender_id);

  if recipient_id is not null then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (recipient_id, 'message', 'New ChatSched Sport message',
      'You have received a new message in your sports network inbox.',
      '/messages?conversation=' || new.conversation_id::text);
  end if;
  return new;
end;
$notification$;
revoke all on function private.create_message_notification() from public, anon, authenticated;
create trigger notify_recipient_after_message
  after insert on public.messages
  for each row execute function private.create_message_notification();

