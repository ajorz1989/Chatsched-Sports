-- Admin operations: report SLAs, content/SEO records and bulk-action audit trail.
create table if not exists public.report_slas (
 id uuid primary key default gen_random_uuid(),
 report_type text not null unique,
 target_hours integer not null check(target_hours>0),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.sport_content_pages (
 id uuid primary key default gen_random_uuid(),
 path text not null unique,
 title text not null,
 meta_description text,
 canonical_url text,
 robots text not null default 'index,follow',
 og_title text,
 og_description text,
 content jsonb not null default '{}'::jsonb,
 status text not null default 'draft' check(status in ('draft','published')),
 updated_by uuid references public.profiles(id) on delete set null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table if not exists public.sport_admin_bulk_actions (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references public.profiles(id) on delete restrict,
 action_type text not null,
 target_table text not null,
 target_ids uuid[] not null,
 reason text,
 created_at timestamptz not null default now()
);
alter table public.report_slas enable row level security;
alter table public.sport_content_pages enable row level security;
alter table public.sport_admin_bulk_actions enable row level security;
create policy "Admins manage report SLAs" on public.report_slas for all to authenticated using(private.is_sport_admin()) with check(private.is_sport_admin());
create policy "Public reads published content" on public.sport_content_pages for select to anon,authenticated using(status='published' or private.is_sport_admin());
create policy "Admins manage content" on public.sport_content_pages for insert to authenticated with check(private.is_sport_admin());
create policy "Admins update content" on public.sport_content_pages for update to authenticated using(private.is_sport_admin()) with check(private.is_sport_admin());
create policy "Admins read bulk action audit" on public.sport_admin_bulk_actions for select to authenticated using(private.is_sport_admin());
create policy "Admins write bulk action audit" on public.sport_admin_bulk_actions for insert to authenticated with check(admin_id=(select auth.uid()) and private.is_sport_admin());
grant select,insert,update,delete on public.report_slas to authenticated;
grant select,insert,update on public.sport_content_pages to authenticated;
grant select,insert on public.sport_admin_bulk_actions to authenticated;
insert into public.report_slas(report_type,target_hours) values('athlete_report',48),('message_report',24),('organisation_report',48),('opportunity_report',48) on conflict(report_type) do nothing;

create or replace function public.record_adult_attestation(policy text)
returns uuid language plpgsql security invoker set search_path=public
as $$
declare rid uuid; dob date; adult boolean;
begin
 select date_of_birth into dob from public.athlete_profiles where user_id=(select auth.uid());
 adult := dob is not null and dob <= (current_date - interval '18 years')::date;
 if not adult then raise exception 'Adult attestation is only available when the account has a date of birth confirming age 18 or older.'; end if;
 insert into public.adult_attestations(user_id,attested_adult,policy_version) values((select auth.uid()),true,policy) on conflict(user_id) do update set attested_adult=true,attested_at=now(),policy_version=excluded.policy_version returning id into rid;
 return rid;
end; $$;
grant execute on function public.record_adult_attestation(text) to authenticated;
