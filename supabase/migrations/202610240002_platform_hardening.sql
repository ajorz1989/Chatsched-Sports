-- ChatSched Sport platform hardening.
-- 1. Expired listings are closed automatically.
-- 2. Trigram/partial indexes so server-side search and pagination scale.
-- 3. Admin decisions are audit-logged atomically by database triggers (not by the browser).
-- 4. Messaging abuse controls: blocks, rate limits, first-contact gating, coalesced notifications.
-- 5. Account deletion is no longer blocked by "on delete restrict" keys; self-service data export;
--    administrator deletion RPC.
-- Apply after all earlier Sport migrations. Safe to re-run.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- 1. Close expired listings
-- ---------------------------------------------------------------------------
create or replace function private.close_expired_opportunities()
returns integer
language plpgsql
security definer
set search_path = ''
as $close$
declare
  closed_count integer;
begin
  update public.opportunities
     set status = 'closed', updated_at = now()
   where status = 'published'
     and closing_date is not null
     and closing_date < current_date;
  get diagnostics closed_count = row_count;
  return closed_count;
end;
$close$;
revoke all on function private.close_expired_opportunities() from public, anon, authenticated;

-- Schedule hourly when pg_cron is available (enable it under Database > Extensions in Supabase).
-- The public catalogue also filters on closing_date, so listings never appear expired even if cron is off.
do $cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'sport-close-expired-opportunities';
    perform cron.schedule('sport-close-expired-opportunities', '5 * * * *', 'select private.close_expired_opportunities()');
  else
    raise notice 'pg_cron is not available; enable it and re-run this migration to schedule automatic closing.';
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end;
$cron$;

-- ---------------------------------------------------------------------------
-- 2. Search and pagination indexes
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create index if not exists opportunities_title_trgm_idx on public.opportunities using gin (title extensions.gin_trgm_ops);
create index if not exists opportunities_summary_trgm_idx on public.opportunities using gin (summary extensions.gin_trgm_ops);
create index if not exists opportunities_location_trgm_idx on public.opportunities using gin (location extensions.gin_trgm_ops);
create index if not exists opportunities_discipline_trgm_idx on public.opportunities using gin (discipline extensions.gin_trgm_ops);
create index if not exists opportunities_open_feed_idx
  on public.opportunities (created_at desc, id)
  where status = 'published' and verification_status = 'verified';
create index if not exists opportunities_closing_date_idx
  on public.opportunities (closing_date) where status = 'published';

create index if not exists profiles_display_name_trgm_idx on public.profiles using gin (display_name extensions.gin_trgm_ops);
create index if not exists profiles_display_name_idx on public.profiles (display_name);
create index if not exists athlete_profiles_position_trgm_idx on public.athlete_profiles using gin (position extensions.gin_trgm_ops);
create index if not exists athlete_profiles_location_trgm_idx on public.athlete_profiles using gin (location extensions.gin_trgm_ops);
create index if not exists athlete_profiles_discipline_trgm_idx on public.athlete_profiles using gin (discipline extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. Atomic admin audit logging
-- ---------------------------------------------------------------------------
alter table public.admin_audit_log alter column actor_id drop not null;

create or replace function private.record_admin_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $audit$
declare
  actor uuid := (select auth.uid());
  action text;
  target_kind text;
  detail jsonb;
begin
  -- Only decisions taken by an allow-listed administrator are audit-logged here; owner and member
  -- changes are not moderation decisions.
  if actor is null or not private.is_sport_admin() then
    return new;
  end if;

  if tg_table_name = 'organisations' then
    if new.verification_status is not distinct from old.verification_status then return new; end if;
    action := 'organisation_' || new.verification_status;
    target_kind := 'organisation';
    detail := jsonb_build_object('name', new.name, 'previous_status', old.verification_status, 'new_status', new.verification_status);
  elsif tg_table_name = 'opportunities' then
    if new.verification_status is not distinct from old.verification_status and new.status is not distinct from old.status then return new; end if;
    action := case when new.verification_status is distinct from old.verification_status
                   then 'opportunity_' || new.verification_status
                   else 'opportunity_listing_' || new.status end;
    target_kind := 'opportunity';
    detail := jsonb_build_object('title', new.title,
      'previous_status', old.verification_status, 'new_status', new.verification_status,
      'previous_listing_status', old.status, 'new_listing_status', new.status);
  elsif tg_table_name = 'opportunity_applications' then
    if new.status is not distinct from old.status then return new; end if;
    action := 'application_status_changed';
    target_kind := 'application';
    detail := jsonb_build_object('previous_status', old.status, 'new_status', new.status);
  elsif tg_table_name = 'safety_reports' then
    if new.status is not distinct from old.status and new.resolution is not distinct from old.resolution then return new; end if;
    action := 'safety_report_' || new.status;
    target_kind := 'safety_report';
    detail := jsonb_build_object('target_type', new.target_type, 'target_id', new.target_id, 'reason', new.reason,
      'previous_status', old.status, 'new_status', new.status);
  elsif tg_table_name = 'career_support_requests' then
    if new.status is not distinct from old.status then return new; end if;
    action := 'career_support_' || new.status;
    target_kind := 'career_support_request';
    detail := jsonb_build_object('service_type', new.service_type, 'previous_status', old.status, 'new_status', new.status);
  elsif tg_table_name = 'organisation_verification_requests' then
    if new.status is not distinct from old.status then return new; end if;
    action := 'organisation_verification_' || new.status;
    target_kind := 'organisation_verification_request';
    detail := jsonb_build_object('organisation_id', new.organisation_id, 'evidence_type', new.evidence_type,
      'previous_status', old.status, 'new_status', new.status);
  else
    return new;
  end if;

  insert into public.admin_audit_log (actor_id, action_type, target_type, target_id, details)
  values (actor, action, target_kind, new.id, detail);
  return new;
end;
$audit$;
revoke all on function private.record_admin_decision() from public, anon, authenticated;

drop trigger if exists audit_admin_decision on public.organisations;
create trigger audit_admin_decision after update on public.organisations
  for each row execute function private.record_admin_decision();
drop trigger if exists audit_admin_decision on public.opportunities;
create trigger audit_admin_decision after update on public.opportunities
  for each row execute function private.record_admin_decision();
drop trigger if exists audit_admin_decision on public.opportunity_applications;
create trigger audit_admin_decision after update on public.opportunity_applications
  for each row execute function private.record_admin_decision();
drop trigger if exists audit_admin_decision on public.safety_reports;
create trigger audit_admin_decision after update on public.safety_reports
  for each row execute function private.record_admin_decision();
drop trigger if exists audit_admin_decision on public.career_support_requests;
create trigger audit_admin_decision after update on public.career_support_requests
  for each row execute function private.record_admin_decision();
drop trigger if exists audit_admin_decision on public.organisation_verification_requests;
create trigger audit_admin_decision after update on public.organisation_verification_requests
  for each row execute function private.record_admin_decision();

-- The audit log becomes append-only for clients: only the triggers above (and the service role) write to it.
drop policy if exists "Sport admins add audit events" on public.admin_audit_log;
revoke insert, update, delete, truncate on public.admin_audit_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Messaging abuse controls
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public, anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
drop policy if exists "Members read their own blocks" on public.user_blocks;
create policy "Members read their own blocks"
  on public.user_blocks for select to authenticated using (blocker_id = (select auth.uid()));
drop policy if exists "Members block others as themselves" on public.user_blocks;
create policy "Members block others as themselves"
  on public.user_blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
drop policy if exists "Members remove their own blocks" on public.user_blocks;
create policy "Members remove their own blocks"
  on public.user_blocks for delete to authenticated using (blocker_id = (select auth.uid()));

create or replace function private.is_blocked_between(first_member uuid, second_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $blocked$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = first_member and b.blocked_id = second_member)
       or (b.blocker_id = second_member and b.blocked_id = first_member)
  );
$blocked$;
revoke all on function private.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- New conversations: no contact across a block, and a daily cap on new threads per member.
create or replace function private.enforce_conversation_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $conversation_limits$
declare
  actor uuid := (select auth.uid());
  recent_threads integer;
begin
  if actor is null then return new; end if;
  if private.is_blocked_between(new.participant_a, new.participant_b) then
    raise exception 'This conversation could not be started.' using errcode = 'P0001';
  end if;
  select count(*) into recent_threads
  from public.conversations c
  where (c.participant_a = actor or c.participant_b = actor)
    and c.created_at > now() - interval '24 hours';
  if recent_threads >= 25 then
    raise exception 'You have started many conversations today. Please try again tomorrow.' using errcode = 'P0001';
  end if;
  return new;
end;
$conversation_limits$;
revoke all on function private.enforce_conversation_limits() from public, anon, authenticated;
drop trigger if exists enforce_conversation_limits on public.conversations;
create trigger enforce_conversation_limits before insert on public.conversations
  for each row execute function private.enforce_conversation_limits();

-- Messages: blocks, burst/daily rate limits, and first-contact gating (a few messages until the other person replies).
create or replace function private.enforce_message_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $message_limits$
declare
  other_member uuid;
  sent_last_minute integer;
  sent_last_day integer;
  sent_in_thread integer;
  replies_in_thread integer;
begin
  select case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end
    into other_member
  from public.conversations c
  where c.id = new.conversation_id and (c.participant_a = new.sender_id or c.participant_b = new.sender_id);
  if other_member is null then return new; end if;

  if private.is_blocked_between(new.sender_id, other_member) then
    raise exception 'This message could not be delivered.' using errcode = 'P0001';
  end if;

  select count(*) filter (where m.created_at > now() - interval '1 minute'),
         count(*)
    into sent_last_minute, sent_last_day
  from public.messages m
  where m.sender_id = new.sender_id and m.created_at > now() - interval '24 hours';
  if sent_last_minute >= 10 then
    raise exception 'You are sending messages too quickly. Please wait a moment.' using errcode = 'P0001';
  end if;
  if sent_last_day >= 300 then
    raise exception 'You have reached the daily message limit.' using errcode = 'P0001';
  end if;

  select count(*) filter (where m.sender_id = new.sender_id),
         count(*) filter (where m.sender_id <> new.sender_id)
    into sent_in_thread, replies_in_thread
  from public.messages m
  where m.conversation_id = new.conversation_id;
  if replies_in_thread = 0 and sent_in_thread >= 3 then
    raise exception 'Please wait for a reply before sending more messages in this conversation.' using errcode = 'P0001';
  end if;
  return new;
end;
$message_limits$;
revoke all on function private.enforce_message_limits() from public, anon, authenticated;
drop trigger if exists enforce_message_limits on public.messages;
create trigger enforce_message_limits before insert on public.messages
  for each row execute function private.enforce_message_limits();

-- One unread notification per conversation, instead of one per message (also limits notification emails).
create or replace function private.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $notification$
declare
  recipient_id uuid;
  thread_path text;
begin
  select case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end
    into recipient_id
  from public.conversations c
  where c.id = new.conversation_id
    and (c.participant_a = new.sender_id or c.participant_b = new.sender_id);

  if recipient_id is null then return new; end if;
  thread_path := '/messages?conversation=' || new.conversation_id::text;

  if not exists (
    select 1 from public.notifications n
    where n.user_id = recipient_id
      and n.notification_type = 'message'
      and n.target_path = thread_path
      and n.read_at is null
  ) then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (recipient_id, 'message', 'New ChatSched Sport message',
      'You have unread messages in your sports network inbox.', thread_path);
  end if;
  return new;
end;
$notification$;
revoke all on function private.create_message_notification() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Account deletion, data export
-- ---------------------------------------------------------------------------
-- Replace "on delete restrict" member references so deleting an account never fails.
--   cascade  : the row is the member's own personal data.
--   set null : the row is a record other people rely on (audit trail, reports, staff notes); it is kept anonymised.
do $retarget$
declare
  spec record;
  existing text;
begin
  for spec in
    select * from (values
      ('admin_audit_log',                    'actor_id',     'set null'),
      ('safety_reports',                     'reporter_id',  'set null'),
      ('career_support_requests',            'athlete_id',   'cascade'),
      ('organisation_verification_requests', 'submitted_by', 'set null'),
      ('talent_shortlists',                  'created_by',   'cascade'),
      ('career_support_case_notes',          'author_id',    'set null'),
      ('career_fee_agreements',              'client_id',    'cascade'),
      ('career_fee_agreements',              'provider_id',  'set null'),
      ('sport_trial_sessions',               'created_by',   'set null'),
      ('sport_trial_results',                'recorded_by',  'set null'),
      ('sport_admin_bulk_actions',           'admin_id',     'set null'),
      ('athlete_evidence_reviews',           'submitted_by', 'cascade'),
      ('athlete_endorsements',               'endorser_id',  'cascade'),
      ('athlete_references',                 'referee_id',   'cascade')
    ) as t(tbl, col, action)
  loop
    for existing in
      select c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.contype = 'f'
        and c.conrelid = ('public.' || spec.tbl)::regclass
        and a.attname = spec.col
    loop
      execute format('alter table public.%I drop constraint %I', spec.tbl, existing);
    end loop;
    if spec.action = 'set null' then
      execute format('alter table public.%I alter column %I drop not null', spec.tbl, spec.col);
    end if;
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete %s',
      spec.tbl, spec.tbl || '_' || spec.col || '_fkey', spec.col, spec.action);
  end loop;
end;
$retarget$;

-- Self-service export. Runs with the caller's rights, so row-level security still applies.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $export$
declare
  member uuid := (select auth.uid());
  result jsonb;
begin
  if member is null then
    raise exception 'Sign in to export your data.';
  end if;
  select jsonb_build_object(
    'exported_at', now(),
    'notice', 'Your personal data held by ChatSched Sport. Messages are limited to those you sent.',
    'profile', (select to_jsonb(p) from public.profiles p where p.id = member),
    'athlete_profile', (select to_jsonb(a) from public.athlete_profiles a where a.user_id = member),
    'achievements', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.athlete_achievements x where x.athlete_id = member),
    'statistics', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.athlete_statistics x where x.athlete_id = member),
    'experience', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.athlete_experience x where x.athlete_id = member),
    'media', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.athlete_media x where x.athlete_id = member),
    'applications', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.opportunity_applications x where x.athlete_id = member),
    'saved_opportunities', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.saved_opportunities x where x.athlete_id = member),
    'saved_searches', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.saved_opportunity_searches x where x.athlete_id = member),
    'career_support_requests', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.career_support_requests x where x.athlete_id = member),
    'organisations', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.organisations x where x.owner_id = member),
    'messages_sent', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.messages x where x.sender_id = member),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.notifications x where x.user_id = member),
    'email_preferences', (select to_jsonb(x) from public.email_preferences x where x.user_id = member),
    'consents', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.compliance_consents x where x.user_id = member),
    'blocked_members', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.user_blocks x where x.blocker_id = member),
    'safety_reports_submitted', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.safety_reports x where x.reporter_id = member)
  ) into result;
  return result;
end;
$export$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Administrator-only: permanently delete an account after a member's deletion request has been reviewed.
-- The audit entry records only the request and account identifiers, never personal content.
create or replace function public.admin_complete_account_deletion(target_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $delete_account$
declare
  actor uuid := (select auth.uid());
  target_user uuid;
begin
  if actor is null or not private.is_sport_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select r.user_id into target_user
  from public.account_deletion_requests r
  where r.id = target_request and r.status in ('requested', 'approved', 'processing')
  for update;
  if target_user is null then
    raise exception 'Deletion request not found or already closed.';
  end if;
  if exists (select 1 from private.sport_admins a where a.user_id = target_user) then
    raise exception 'Remove this account from the administrator allow-list before deleting it.';
  end if;

  insert into public.admin_audit_log (actor_id, action_type, target_type, target_id, details)
  values (actor, 'account_deleted', 'account', target_user, jsonb_build_object('request_id', target_request));

  delete from auth.users where id = target_user;
end;
$delete_account$;
revoke all on function public.admin_complete_account_deletion(uuid) from public, anon;
grant execute on function public.admin_complete_account_deletion(uuid) to authenticated;

comment on function private.close_expired_opportunities() is 'Closes published listings whose closing_date has passed. Scheduled hourly via pg_cron when available.';
comment on function private.record_admin_decision() is 'Writes admin_audit_log in the same transaction as an administrator moderation decision.';
comment on function private.enforce_message_limits() is 'Blocks, rate limits and first-contact gating for new messages.';
comment on function public.export_my_data() is 'Returns the calling member''s own personal data as JSON (POPIA access request).';
