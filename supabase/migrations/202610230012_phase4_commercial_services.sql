-- Phase 4: commercial services and billing foundation.
-- This migration does not collect or confirm money. A payment provider/webhook must
-- be connected before a billing account can be marked active/paid.

create table if not exists public.sport_billing_accounts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null unique references public.organisations(id) on delete cascade,
  plan_code text not null default 'free' check (plan_code in ('free','club_pro','academy_pro','agency_pro')),
  billing_status text not null default 'free' check (billing_status in ('free','pending','active','past_due','cancelled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_service_orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  service_code text not null check (service_code in ('club_pro','academy_pro','agency_pro','trial_day')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'ZAR' check (currency='ZAR'),
  status text not null default 'pending' check (status in ('pending','payment_pending','paid','cancelled','refunded')),
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.sport_billing_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete set null,
  order_id uuid references public.sport_service_orders(id) on delete set null,
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists sport_service_orders_org_idx on public.sport_service_orders(organisation_id,created_at desc);
create index if not exists sport_billing_events_org_idx on public.sport_billing_events(organisation_id,received_at desc);

alter table public.sport_billing_accounts enable row level security;
alter table public.sport_service_orders enable row level security;
alter table public.sport_billing_events enable row level security;

create policy "Organisation owners read billing account"
on public.sport_billing_accounts for select to authenticated
using (exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());

create policy "Organisation owners create billing account"
on public.sport_billing_accounts for insert to authenticated
with check (exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())));

create policy "Organisation owners read service orders"
on public.sport_service_orders for select to authenticated
using (exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());

create policy "Organisation owners create service orders"
on public.sport_service_orders for insert to authenticated
with check (
  created_by=(select auth.uid())
  and exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid()))
);

create policy "Organisation owners read billing events"
on public.sport_billing_events for select to authenticated
using (exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) or private.is_sport_admin());

grant select,insert,update on public.sport_billing_accounts to authenticated;
grant select,insert on public.sport_service_orders to authenticated;
grant select on public.sport_billing_events to authenticated;

create or replace function public.request_sport_service(
  target_organisation uuid,
  target_service text
)
returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare
  price integer;
  order_id_value uuid;
  user_id_value uuid := (select auth.uid());
begin
  if user_id_value is null then raise exception 'Authentication is required.'; end if;
  if not exists(select 1 from public.organisations where id=target_organisation and owner_id=user_id_value) then
    raise exception 'You do not control this organisation.';
  end if;

  price := case target_service
    when 'club_pro' then 49900
    when 'academy_pro' then 89900
    when 'agency_pro' then 149900
    when 'trial_day' then 29900
    else null end;
  if price is null then raise exception 'Unsupported Sport service.'; end if;

  insert into public.sport_service_orders(organisation_id,created_by,service_code,amount_cents,status)
  values(target_organisation,user_id_value,target_service,price,'payment_pending')
  returning id into order_id_value;

  return order_id_value;
end;
$$;

revoke all on function public.request_sport_service(uuid,text) from public,anon;
grant execute on function public.request_sport_service(uuid,text) to authenticated;

