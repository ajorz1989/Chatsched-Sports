-- Public contact, concern, safeguarding and data-request inbox.
-- Anonymous visitors cannot write to the table directly: all submissions go through
-- public.submit_contact_message(), which validates input, applies rate limits and sets priority server-side.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('general','support','data_request','concern','safeguarding','partnership')),
  name text not null check (length(btrim(name)) between 1 and 120),
  email text not null check (length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  subject text check (subject is null or length(subject) <= 200),
  message text not null check (length(btrim(message)) between 10 and 5000),
  related_url text check (related_url is null or length(related_url) <= 500),
  user_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'new' check (status in ('new','in_progress','resolved','spam')),
  admin_notes text check (admin_notes is null or length(admin_notes) <= 4000),
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_inbox_idx on public.contact_messages (status, priority, created_at desc);
create index if not exists contact_messages_email_recent_idx on public.contact_messages (lower(email), created_at desc);
create index if not exists contact_messages_user_idx on public.contact_messages (user_id) where user_id is not null;

alter table public.contact_messages enable row level security;

-- Supabase grants broad default privileges; remove them so only the RPC and admins can touch the table.
revoke all on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update (status, priority, admin_notes, handled_by, handled_at) on public.contact_messages to authenticated;

drop policy if exists "Senders and admins read contact messages" on public.contact_messages;
create policy "Senders and admins read contact messages" on public.contact_messages
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_sport_admin());

drop policy if exists "Admins triage contact messages" on public.contact_messages;
create policy "Admins triage contact messages" on public.contact_messages
  for update to authenticated
  using (private.is_sport_admin())
  with check (private.is_sport_admin());

create or replace function public.submit_contact_message(
  p_kind text,
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_related_url text default null,
  p_website text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  prio text;
  clean_email text := lower(btrim(coalesce(p_email, '')));
begin
  -- Honeypot: real people never fill the hidden "website" field. Pretend success, store nothing.
  if p_website is not null and btrim(p_website) <> '' then
    return gen_random_uuid();
  end if;

  if p_kind is null or p_kind not in ('general','support','data_request','concern','safeguarding','partnership') then
    raise exception 'Choose a valid message type.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'Please enter your name.' using errcode = '22023';
  end if;
  if clean_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(clean_email) > 254 then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_message, ''))) < 10 then
    raise exception 'Please write at least 10 characters so we can help.' using errcode = '22023';
  end if;

  -- Per-address limit stops a single sender flooding the team; the global limit protects the inbox.
  if (select count(*) from public.contact_messages
        where lower(email) = clean_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'You have sent several messages recently. Please wait a while before sending another.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.contact_messages
        where kind not in ('safeguarding','concern') and created_at > now() - interval '1 hour') >= 200 then
    raise exception 'We are receiving a very high volume of messages. Please try again later.' using errcode = 'P0001';
  end if;

  -- Priority is decided here, never by the client.
  prio := case p_kind
    when 'safeguarding' then 'urgent'
    when 'concern' then 'high'
    when 'data_request' then 'high'
    else 'normal' end;

  insert into public.contact_messages (kind, name, email, subject, message, related_url, user_id, priority)
  values (p_kind, btrim(p_name), clean_email, nullif(btrim(coalesce(p_subject, '')), ''),
          btrim(p_message), nullif(btrim(coalesce(p_related_url, '')), ''), (select auth.uid()), prio)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text, text, text) to anon, authenticated;

-- Stamp who handled a message and when, without trusting the client.
create or replace function private.stamp_contact_handling()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status or new.admin_notes is distinct from old.admin_notes then
    new.handled_by := (select auth.uid());
    new.handled_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_contact_handling() from public, anon, authenticated;

drop trigger if exists stamp_contact_handling on public.contact_messages;
create trigger stamp_contact_handling before update on public.contact_messages
  for each row execute function private.stamp_contact_handling();
