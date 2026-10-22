-- Evidence-led organisation verification for ChatSched Sport.
-- Apply only after migrations 001, 002 and 003 in the dedicated Sport database.

create table if not exists public.organisation_verification_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  evidence_type text not null check (
    evidence_type in ('official_website','registration_document','federation_affiliation','school_or_academy','other')
  ),
  evidence_url text check (evidence_url is null or evidence_url ~* '^https://'),
  evidence_notes text check (evidence_notes is null or length(trim(evidence_notes)) <= 4000),
  status text not null default 'pending' check (status in ('pending','in_review','approved','rejected')),
  admin_notes text check (admin_notes is null or length(trim(admin_notes)) <= 4000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (evidence_url is not null or length(trim(coalesce(evidence_notes,''))) >= 10)
);

create index if not exists organisation_verification_org_idx
  on public.organisation_verification_requests(organisation_id, created_at desc);
create index if not exists organisation_verification_status_idx
  on public.organisation_verification_requests(status, created_at desc);
create unique index if not exists one_open_organisation_verification_request
  on public.organisation_verification_requests(organisation_id)
  where status in ('pending','in_review');

alter table public.organisation_verification_requests enable row level security;
revoke all on public.organisation_verification_requests from public, anon, authenticated;
grant select, insert on public.organisation_verification_requests to authenticated;
grant update (status, admin_notes, reviewed_by, reviewed_at, updated_at)
  on public.organisation_verification_requests to authenticated;

create policy "Organisation owners read their verification requests"
  on public.organisation_verification_requests for select to authenticated
  using (
    exists (
      select 1 from public.organisations organisation
      where organisation.id = organisation_id and organisation.owner_id = (select auth.uid())
    )
    or private.is_sport_admin()
  );

create policy "Organisation owners submit verification evidence"
  on public.organisation_verification_requests for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and exists (
      select 1 from public.organisations organisation
      where organisation.id = organisation_id
        and organisation.owner_id = (select auth.uid())
        and organisation.verification_status <> 'verified'
    )
  );

create policy "Sport admins review verification requests"
  on public.organisation_verification_requests for update to authenticated
  using (private.is_sport_admin())
  with check (private.is_sport_admin());

-- Prevent an administrator from marking an organisation verified without an
-- approved evidence request. The most recent submission must be the approved one.
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

  if tg_table_name = 'organisations'
     and new.verification_status = 'verified'
     and not exists (
       select 1
       from public.organisation_verification_requests request
       where request.organisation_id = new.id
         and request.status = 'approved'
         and request.created_at = (
           select max(latest.created_at)
           from public.organisation_verification_requests latest
           where latest.organisation_id = new.id
         )
     ) then
    raise exception 'An organisation needs an approved, latest verification evidence request before it can be verified.';
  end if;
  return new;
end;
$guard$;
revoke all on function private.guard_verification_fields() from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.sync_organisation_verification_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $verification_sync$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      update public.organisations
        set verification_status = 'verified', updated_at = now()
        where id = new.organisation_id;
    elsif new.status = 'rejected' then
      update public.organisations
        set verification_status = 'rejected', updated_at = now()
        where id = new.organisation_id;
    elsif new.status in ('pending','in_review') then
      update public.organisations
        set verification_status = 'pending', updated_at = now()
        where id = new.organisation_id and verification_status <> 'verified';
    end if;

    insert into public.notifications (user_id, notification_type, title, body, target_path)
    select organisation.owner_id, 'verification_status', 'Organisation verification updated',
      'Your organisation verification request is now ' || replace(new.status, '_', ' ') || '.',
      '/workspace'
    from public.organisations organisation
    where organisation.id = new.organisation_id;
  end if;
  return new;
end;
$verification_sync$;
revoke all on function private.sync_organisation_verification_request() from public, anon, authenticated;

drop trigger if exists sync_organisation_verification_request_status on public.organisation_verification_requests;
create trigger sync_organisation_verification_request_status
  after update of status on public.organisation_verification_requests
  for each row execute function private.sync_organisation_verification_request();

create or replace function private.notify_admins_on_verification_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $verification_notice$
begin
  insert into public.notifications (user_id, notification_type, title, body, target_path)
  select administrator.user_id, 'organisation_verification', 'Organisation evidence submitted',
    'A new organisation verification request is ready for review.',
    '/admin'
  from private.sport_admins administrator
  join public.profiles profile on profile.id = administrator.user_id;
  return new;
end;
$verification_notice$;
revoke all on function private.notify_admins_on_verification_request() from public, anon, authenticated;
create trigger notify_admins_after_verification_request
  after insert on public.organisation_verification_requests
  for each row execute function private.notify_admins_on_verification_request();

comment on table public.organisation_verification_requests is
  'Private verification evidence submitted by an organisation owner. Only the owner and allow-listed Sport administrators can read it.';
