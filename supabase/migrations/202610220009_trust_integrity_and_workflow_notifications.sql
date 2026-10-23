-- ChatSched Sport trust-integrity hardening and workflow notifications.
-- Apply after migrations 001-008 in the dedicated Sport Supabase project.
--
-- This migration makes verification and publishing rules database-enforced,
-- so direct API calls cannot bypass the UI.

create or replace function private.guard_organisation_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $organisation_guard$
begin
  if not private.is_sport_admin()
     and old.verification_status = 'verified'
     and (
       new.name is distinct from old.name
       or new.organisation_type is distinct from old.organisation_type
       or new.website is distinct from old.website
       or new.location is distinct from old.location
       or new.country is distinct from old.country
       or new.description is distinct from old.description
     )
  then
    new.verification_status := 'pending';
  end if;

  return new;
end;
$organisation_guard$;

revoke all on function private.guard_organisation_trust_fields() from public, anon, authenticated;
grant usage on schema private to authenticated;

drop trigger if exists organisations_trust_integrity_guard on public.organisations;
create trigger organisations_trust_integrity_guard
  before update on public.organisations
  for each row
  execute function private.guard_organisation_trust_fields();

create or replace function private.guard_opportunity_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $opportunity_guard$
declare
  organisation_status text;
  substantive_change boolean;
begin
  select verification_status into organisation_status
  from public.organisations
  where id = new.organisation_id;

  substantive_change := (
    new.title is distinct from old.title
    or new.opportunity_type is distinct from old.opportunity_type
    or new.sport_id is distinct from old.sport_id
    or new.discipline is distinct from old.discipline
    or new.positions is distinct from old.positions
    or new.location is distinct from old.location
    or new.country is distinct from old.country
    or new.competition_level is distinct from old.competition_level
    or new.summary is distinct from old.summary
    or new.description is distinct from old.description
    or new.eligibility is distinct from old.eligibility
    or new.closing_date is distinct from old.closing_date
    or new.compensation_type is distinct from old.compensation_type
  );

  if not private.is_sport_admin() then
    if new.status = 'published'
       and (
         new.verification_status <> 'verified'
         or coalesce(organisation_status,'') <> 'verified'
       )
    then
      raise exception 'An opportunity can only be published after both the listing and organisation are verified.';
    end if;

    if old.verification_status = 'verified' and substantive_change then
      new.verification_status := 'pending';
      if new.status = 'published' then
        new.status := 'draft';
      end if;
    end if;
  end if;

  return new;
end;
$opportunity_guard$;

revoke all on function private.guard_opportunity_trust_fields() from public, anon, authenticated;
drop trigger if exists opportunities_trust_integrity_guard on public.opportunities;
create trigger opportunities_trust_integrity_guard
  before update on public.opportunities
  for each row
  execute function private.guard_opportunity_trust_fields();

-- An organisation losing verified status automatically removes its public listings.
create or replace function private.sync_opportunities_after_organisation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $organisation_sync$
begin
  if new.verification_status is distinct from old.verification_status
     and new.verification_status <> 'verified'
  then
    update public.opportunities
      set verification_status = 'pending',
          status = case when status = 'published' then 'draft' else status end,
          updated_at = now()
    where organisation_id = new.id
      and (status = 'published' or verification_status = 'verified');

    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (
      new.owner_id,
      'organisation_status',
      'Organisation verification changed',
      'Your organisation is no longer verified, so its public opportunities have been removed from the public catalogue until verification is restored.',
      '/workspace'
    );
  end if;
  return new;
end;
$organisation_sync$;

revoke all on function private.sync_opportunities_after_organisation_change() from public, anon, authenticated;
drop trigger if exists sync_opportunities_after_organisation_change on public.organisations;
create trigger sync_opportunities_after_organisation_change
  after update of verification_status on public.organisations
  for each row
  execute function private.sync_opportunities_after_organisation_change();

-- Application lifecycle notifications keep both sides informed without exposing
-- private message content to unrelated users.
create or replace function private.notify_application_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $application_notice$
declare
  recipient_id uuid;
  opportunity_title text;
  organisation_owner uuid;
begin
  select opportunity.title, organisation.owner_id
    into opportunity_title, organisation_owner
  from public.opportunities opportunity
  join public.organisations organisation on organisation.id = opportunity.organisation_id
  where opportunity.id = new.opportunity_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (
      organisation_owner,
      'application_received',
      'New application received',
      'A new athlete application was submitted for "' || coalesce(opportunity_title,'your opportunity') || '".',
      '/workspace'
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (
      new.athlete_id,
      'application_status',
      'Application status updated',
      'Your application for "' || coalesce(opportunity_title,'an opportunity') || '" is now ' || replace(new.status,'_',' ') || '.',
      '/workspace'
    );

    insert into public.notifications (user_id, notification_type, title, body, target_path)
    values (
      organisation_owner,
      'application_status',
      'Application status saved',
      'An application decision for "' || coalesce(opportunity_title,'your opportunity') || '" was updated.',
      '/workspace'
    );
  end if;

  return new;
end;
$application_notice$;

revoke all on function private.notify_application_events() from public, anon, authenticated;
drop trigger if exists notify_application_events_after_insert on public.opportunity_applications;
create trigger notify_application_events_after_insert
  after insert on public.opportunity_applications
  for each row
  execute function private.notify_application_events();

drop trigger if exists notify_application_events_after_update on public.opportunity_applications;
create trigger notify_application_events_after_update
  after update of status on public.opportunity_applications
  for each row
  execute function private.notify_application_events();

comment on function private.guard_opportunity_trust_fields() is
  'Database-level publishing and verification integrity: owners cannot publish unverified opportunities or silently edit verified listing content.';
comment on function private.guard_organisation_trust_fields() is
  'Database-level trust integrity: substantive edits to verified organisations return them to pending review.';
comment on table public.notifications is
  'Private recipient notifications generated by verified database workflows and user-visible application/message activity.';
