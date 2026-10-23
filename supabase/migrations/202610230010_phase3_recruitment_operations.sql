-- Phase 3: recruitment operations, application audit history and trial publishing safeguards.

create table if not exists public.opportunity_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete set null,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists opportunity_application_events_application_idx
  on public.opportunity_application_events(application_id,created_at desc);
alter table public.opportunity_application_events enable row level security;
create policy "Applicants read their application events"
  on public.opportunity_application_events for select to authenticated
  using(athlete_id=(select auth.uid()) or private.is_sport_admin());
create policy "Organisation owners read application events"
  on public.opportunity_application_events for select to authenticated
  using(
    exists(
      select 1 from public.organisations o
      where o.id=organisation_id and o.owner_id=(select auth.uid())
    ) or private.is_sport_admin()
  );
grant select on public.opportunity_application_events to authenticated;

create or replace function private.record_application_status_event()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare org_id uuid;
begin
  select o.organisation_id into org_id
  from public.opportunities o
  where o.id=new.opportunity_id;

  if tg_op='INSERT' then
    insert into public.opportunity_application_events(
      application_id,athlete_id,organisation_id,from_status,to_status,changed_by,note
    ) values (
      new.id,new.athlete_id,org_id,null,new.status,new.athlete_id,'Application submitted'
    );
  elsif old.status is distinct from new.status then
    insert into public.opportunity_application_events(
      application_id,athlete_id,organisation_id,from_status,to_status,changed_by,note
    ) values (
      new.id,new.athlete_id,org_id,old.status,new.status,
      case when (select auth.uid()) is not null then (select auth.uid()) else null end,
      null
    );
    insert into public.notifications(user_id,notification_type,title,body,target_path)
    values(
      new.athlete_id,
      'application_status_update',
      'Your application status changed',
      'Your application for this opportunity is now marked "'||replace(new.status,'_',' ')||'".',
      '/workspace'
    );
  end if;
  return new;
end;
$$;
revoke all on function private.record_application_status_event() from public,anon,authenticated;
drop trigger if exists record_application_status_event_after_application on public.opportunity_applications;
create trigger record_application_status_event_after_application
after insert or update of status on public.opportunity_applications
for each row execute function private.record_application_status_event();

-- Trial sessions may only become publishable after payment and slot generation.
create or replace function private.prevent_unpaid_trial_publish()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
begin
  if new.status='published' and (
    new.billing_status is distinct from 'paid'
    or not exists(
      select 1 from public.sport_trial_slots s
      where s.trial_session_id=new.id
    )
  ) then
    raise exception 'Trial sessions require confirmed payment and at least one generated slot before publishing.';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_unpaid_trial_publish() from public,anon,authenticated;
drop trigger if exists prevent_unpaid_trial_publish_before_update on public.sport_trial_sessions;
create trigger prevent_unpaid_trial_publish_before_update
before insert or update of status,billing_status on public.sport_trial_sessions
for each row execute function private.prevent_unpaid_trial_publish();

-- Safe, one-time reference invitation tokens. Store only a hash, never the raw token.
create table if not exists public.athlete_reference_invites (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.athlete_reference_requests(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists athlete_reference_invites_request_idx
  on public.athlete_reference_invites(request_id,expires_at desc);
alter table public.athlete_reference_invites enable row level security;
create policy "Athletes manage reference invites"
  on public.athlete_reference_invites for select to authenticated
  using(athlete_id=(select auth.uid()) or private.is_sport_admin());
grant select on public.athlete_reference_invites to authenticated;

create or replace function public.create_reference_invite(target_request uuid)
returns table(invite_id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security invoker
set search_path=public
as $$
declare
  rid uuid;
  token text;
  expiry timestamptz;
begin
  select id into rid
  from public.athlete_reference_requests
  where id=target_request and athlete_id=(select auth.uid())
    and status='requested';
  if rid is null then
    raise exception 'Reference request not found or not eligible for an invitation.';
  end if;

  token := encode(gen_random_bytes(32),'hex');
  expiry := now()+interval '7 days';

  delete from public.athlete_reference_invites
  where request_id=rid and accepted_at is null;

  insert into public.athlete_reference_invites(request_id,athlete_id,token_hash,expires_at)
  values(rid,(select auth.uid()),encode(digest(token,'sha256'),'hex'),expiry)
  returning id into invite_id;

  raw_token:=token;
  expires_at:=expiry;
  return next;
end;
$$;
revoke all on function public.create_reference_invite(uuid) from public,anon;
grant execute on function public.create_reference_invite(uuid) to authenticated;

create or replace function public.accept_reference_invite(target_invite uuid, raw_token text)
returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare request_id_value uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;
  select request_id into request_id_value
  from public.athlete_reference_invites
  where id=target_invite
    and accepted_at is null
    and expires_at>now()
    and token_hash=encode(digest(raw_token,'sha256'),'hex')
  for update;

  if request_id_value is null then
    raise exception 'This reference invitation is invalid or expired.';
  end if;
  if exists(select 1 from public.athlete_reference_requests where id=request_id_value and athlete_id=(select auth.uid())) then
    raise exception 'The athlete who created the request cannot accept their own reference invitation.';
  end if;

  update public.athlete_reference_invites
  set accepted_at=now()
  where id=target_invite;

  update public.athlete_reference_requests
  set status='accepted', referee_id=(select auth.uid())
  where id=request_id_value and status='requested' and athlete_id<>(select auth.uid());

  return request_id_value;
end;
$$;
revoke all on function public.accept_reference_invite(uuid,text) from public,anon;
grant execute on function public.accept_reference_invite(uuid,text) to authenticated;
