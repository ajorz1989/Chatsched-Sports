-- Security and integrity fixes found during a code and RLS audit.
-- Each section is independent and safe to re-run. Apply after 202610240002.
--
--  1. Billing: members can no longer activate paid plans or mark orders paid themselves.
--  2. Trial sessions: members can no longer mark their own trial-day fee as paid.
--  3. Trust signals: statistics, achievements, references, endorsements and evidence reviews cannot be self-verified.
--  4. Applications: athletes can withdraw (UPDATE) their own application; previously the update was silently blocked.
--  5. Notifications: remove duplicate application notifications (three per status change before this fix).
--  6. Reference invites: pgcrypto lives in the "extensions" schema on Supabase and invite creation needed elevated rights.
--  7. Defence in depth: anonymous roles cannot read date of birth columns.

-- ---------------------------------------------------------------------------
-- 1. Billing: only provider-confirmed state (service role / webhook / admin) may activate a plan
-- ---------------------------------------------------------------------------
drop policy if exists "Organisation owners create billing account" on public.sport_billing_accounts;
create policy "Organisation owners create a free billing account"
  on public.sport_billing_accounts for insert to authenticated
  with check (
    exists (select 1 from public.organisations o where o.id = organisation_id and o.owner_id = (select auth.uid()))
    and plan_code = 'free'
    and billing_status = 'free'
    and provider is null
    and provider_customer_id is null
    and provider_subscription_id is null
    and current_period_start is null
    and current_period_end is null
  );
revoke update on public.sport_billing_accounts from authenticated;

-- Orders are created only through the RPC below, which fixes the price and status server-side.
drop policy if exists "Organisation owners create service orders" on public.sport_service_orders;
revoke insert, update on public.sport_service_orders from authenticated;

create or replace function public.request_sport_service(target_organisation uuid, target_service text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $request$
declare
  member uuid := (select auth.uid());
  price integer;
  existing_order uuid;
  new_order uuid;
begin
  if member is null then
    raise exception 'Authentication is required.';
  end if;
  if not exists (select 1 from public.organisations o where o.id = target_organisation and o.owner_id = member) then
    raise exception 'You do not control this organisation.';
  end if;

  price := case target_service
    when 'club_pro' then 49900
    when 'academy_pro' then 89900
    when 'agency_pro' then 149900
    when 'trial_day' then 29900
    else null end;
  if price is null then
    raise exception 'Unsupported Sport service.';
  end if;

  -- Re-use an open order for the same service instead of creating duplicates.
  select id into existing_order
  from public.sport_service_orders
  where organisation_id = target_organisation and service_code = target_service
    and status in ('pending', 'payment_pending')
  order by created_at desc
  limit 1;
  if existing_order is not null then
    return existing_order;
  end if;

  insert into public.sport_service_orders (organisation_id, created_by, service_code, amount_cents, status)
  values (target_organisation, member, target_service, price, 'payment_pending')
  returning id into new_order;
  return new_order;
end;
$request$;
revoke all on function public.request_sport_service(uuid, text) from public, anon;
grant execute on function public.request_sport_service(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Trial sessions: payment fields are written only by administrators or the service role
-- ---------------------------------------------------------------------------
create or replace function private.lock_trial_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $trial_payment$
begin
  if (select auth.uid()) is null or private.is_sport_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.billing_status := 'unpaid';
    new.paid_at := null;
  else
    new.billing_status := old.billing_status;
    new.paid_at := old.paid_at;
  end if;
  return new;
end;
$trial_payment$;
revoke all on function private.lock_trial_payment_fields() from public, anon, authenticated;
-- Trigger names sort alphabetically: this runs before the publish guards ("guard_..." and "prevent_...").
drop trigger if exists a_lock_trial_payment_fields on public.sport_trial_sessions;
create trigger a_lock_trial_payment_fields
  before insert or update on public.sport_trial_sessions
  for each row execute function private.lock_trial_payment_fields();

-- ---------------------------------------------------------------------------
-- 3. Trust signals cannot be self-verified
-- ---------------------------------------------------------------------------
create or replace function private.guard_statistic_achievement_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $verification$
declare
  content_changed boolean := false;
begin
  if (select auth.uid()) is null or private.is_sport_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'self_reported';
    new.verified_by := null;
    new.verified_at := null;
    return new;
  end if;

  if tg_table_name = 'athlete_statistics' then
    content_changed := (to_jsonb(new) - array['verification_status', 'verified_by', 'verified_at', 'updated_at'])
                       is distinct from (to_jsonb(old) - array['verification_status', 'verified_by', 'verified_at', 'updated_at']);
  else
    content_changed := (to_jsonb(new) - array['verification_status', 'verified_by', 'verified_at'])
                       is distinct from (to_jsonb(old) - array['verification_status', 'verified_by', 'verified_at']);
  end if;

  -- Members may only move between self_reported and pending_review; decisions belong to reviewers.
  if new.verification_status is distinct from old.verification_status
     and not (old.verification_status in ('self_reported', 'pending_review') and new.verification_status in ('self_reported', 'pending_review')) then
    new.verification_status := old.verification_status;
  end if;
  new.verified_by := old.verified_by;
  new.verified_at := old.verified_at;

  -- Editing the substance of a verified or rejected entry returns it to self-reported.
  if content_changed and old.verification_status in ('verified', 'rejected') then
    new.verification_status := 'self_reported';
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$verification$;
revoke all on function private.guard_statistic_achievement_verification() from public, anon, authenticated;
drop trigger if exists guard_verification on public.athlete_statistics;
create trigger guard_verification before insert or update on public.athlete_statistics
  for each row execute function private.guard_statistic_achievement_verification();
drop trigger if exists guard_verification on public.athlete_achievements;
create trigger guard_verification before insert or update on public.athlete_achievements
  for each row execute function private.guard_statistic_achievement_verification();

-- Evidence submissions start as pending; only administrators review them.
create or replace function private.guard_evidence_review_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $evidence$
begin
  if (select auth.uid()) is null or private.is_sport_admin() then
    return new;
  end if;
  new.status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.reviewer_notes := null;
  return new;
end;
$evidence$;
revoke all on function private.guard_evidence_review_insert() from public, anon, authenticated;
drop trigger if exists guard_evidence_review_insert on public.athlete_evidence_reviews;
create trigger guard_evidence_review_insert before insert on public.athlete_evidence_reviews
  for each row execute function private.guard_evidence_review_insert();

-- Endorsements: the endorser writes, the ATHLETE accepts. The endorser can only withdraw.
-- References: the athlete requests, the REFEREE confirms. The athlete can only withdraw.
create or replace function private.guard_third_party_statements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $statements$
declare
  member uuid := (select auth.uid());
  author uuid;
  subject uuid;
  decider uuid;
  text_changed boolean;
begin
  if member is null or private.is_sport_admin() then
    return new;
  end if;

  if tg_table_name = 'athlete_endorsements' then
    author := new.endorser_id; subject := new.athlete_id; decider := new.athlete_id;
  else
    author := new.referee_id; subject := new.athlete_id; decider := new.referee_id;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.verified_by := null;
    new.verified_at := null;
    return new;
  end if;

  -- Participants cannot re-point a statement at someone else.
  new.athlete_id := old.athlete_id;
  if tg_table_name = 'athlete_endorsements' then
    new.endorser_id := old.endorser_id;
    text_changed := new.endorsement_text is distinct from old.endorsement_text;
  else
    new.referee_id := old.referee_id;
    text_changed := new.reference_text is distinct from old.reference_text;
  end if;
  new.verified_by := old.verified_by;
  new.verified_at := old.verified_at;

  if new.status is distinct from old.status then
    if new.status in ('approved', 'rejected') then
      -- Only the deciding party may approve or reject, and only from pending.
      if member <> decider or old.status <> 'pending' then
        new.status := old.status;
      end if;
    elsif new.status = 'withdrawn' then
      if member <> author and member <> subject then
        new.status := old.status;
      end if;
    elsif new.status <> 'pending' or old.status <> 'withdrawn' then
      new.status := old.status;
    end if;
  end if;

  -- Changing the wording of an approved statement requires approval again.
  if text_changed and old.status = 'approved' and new.status = 'approved' then
    new.status := 'pending';
  end if;
  return new;
end;
$statements$;
revoke all on function private.guard_third_party_statements() from public, anon, authenticated;
drop trigger if exists guard_statement on public.athlete_endorsements;
create trigger guard_statement before insert or update on public.athlete_endorsements
  for each row execute function private.guard_third_party_statements();
drop trigger if exists guard_statement on public.athlete_references;
create trigger guard_statement before insert or update on public.athlete_references
  for each row execute function private.guard_third_party_statements();

-- ---------------------------------------------------------------------------
-- 4. Athletes can withdraw their own application (the app updates status = 'withdrawn')
-- ---------------------------------------------------------------------------
drop policy if exists "Athletes can withdraw open applications" on public.opportunity_applications;
create policy "Athletes can withdraw open applications"
  on public.opportunity_applications for update to authenticated
  using (athlete_id = (select auth.uid()) and status in ('submitted', 'reviewing', 'shortlisted'))
  with check (athlete_id = (select auth.uid()) and status = 'withdrawn');

-- ---------------------------------------------------------------------------
-- 5. One notification per application event
-- ---------------------------------------------------------------------------
drop trigger if exists notify_organisation_after_application on public.opportunity_applications;
drop trigger if exists notify_athlete_after_application_status on public.opportunity_applications;

create or replace function private.record_application_status_event()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $application_event$
declare org_id uuid;
begin
  select o.organisation_id into org_id
  from public.opportunities o
  where o.id = new.opportunity_id;

  if tg_op = 'INSERT' then
    insert into public.opportunity_application_events (application_id, athlete_id, organisation_id, from_status, to_status, changed_by, note)
    values (new.id, new.athlete_id, org_id, null, new.status, new.athlete_id, 'Application submitted');
  elsif old.status is distinct from new.status then
    insert into public.opportunity_application_events (application_id, athlete_id, organisation_id, from_status, to_status, changed_by, note)
    values (new.id, new.athlete_id, org_id, old.status, new.status, (select auth.uid()), null);
  end if;
  return new;
end;
$application_event$;
revoke all on function private.record_application_status_event() from public, anon, authenticated;

create or replace function private.notify_application_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $application_notice$
declare
  opportunity_title text;
  organisation_owner uuid;
  actor uuid := (select auth.uid());
begin
  select opportunity.title, organisation.owner_id
    into opportunity_title, organisation_owner
  from public.opportunities opportunity
  join public.organisations organisation on organisation.id = opportunity.organisation_id
  where opportunity.id = new.opportunity_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (organisation_owner, 'application_received', 'New application received',
      'A new athlete application was submitted for "' || coalesce(opportunity_title, 'your opportunity') || '".', '/workspace');
    return new;
  end if;

  if new.status is distinct from old.status then
    if actor is not null and actor = new.athlete_id then
      -- The athlete changed it (withdrawal): tell the organisation.
      insert into public.notifications (user_id, notification_type, title, body, target_path)
      values (organisation_owner, 'application_status', 'Application ' || replace(new.status, '_', ' '),
        'An applicant ' || replace(new.status, '_', ' ') || ' their application for "' || coalesce(opportunity_title, 'your opportunity') || '".', '/workspace');
    else
      insert into public.notifications (user_id, notification_type, title, body, target_path)
      values (new.athlete_id, 'application_status', 'Application status updated',
        'Your application for "' || coalesce(opportunity_title, 'an opportunity') || '" is now ' || replace(new.status, '_', ' ') || '.', '/workspace');
    end if;
  end if;
  return new;
end;
$application_notice$;
revoke all on function private.notify_application_events() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Reference invites: pgcrypto is in the "extensions" schema on Supabase
-- ---------------------------------------------------------------------------
-- create_reference_invite checks athlete ownership itself, but must write to the invites table, which members
-- cannot insert into directly; it therefore runs with definer rights.
alter function public.create_reference_invite(uuid) security definer set search_path = public, extensions;
alter function public.accept_reference_invite(uuid, text) set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 7. Defence in depth
-- ---------------------------------------------------------------------------
revoke select (date_of_birth) on public.athlete_profiles from anon;
