-- Verified evidence, endorsements, scout workbench and compliance foundations.
alter table public.athlete_achievements
  add column if not exists verification_status text not null default 'self_reported',
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists evidence_url text,
  add constraint athlete_achievements_verification_status_check check(verification_status in ('self_reported','pending_review','verified','rejected'));

alter table public.athlete_statistics
  add column if not exists verification_status text not null default 'self_reported',
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add constraint athlete_statistics_verification_status_check check(verification_status in ('self_reported','pending_review','verified','rejected'));

create table if not exists public.athlete_evidence_reviews (
 id uuid primary key default gen_random_uuid(),
 athlete_id uuid not null references public.profiles(id) on delete cascade,
 achievement_id uuid references public.athlete_achievements(id) on delete cascade,
 statistic_id uuid references public.athlete_statistics(id) on delete cascade,
 evidence_type text not null check(evidence_type in ('certificate','club_record','league_record','match_report','video','document','other')),
 evidence_url text,
 evidence_notes text,
 status text not null default 'pending' check(status in ('pending','approved','rejected','needs_more_info')),
 submitted_by uuid not null references public.profiles(id) on delete restrict,
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz,
 reviewer_notes text,
 created_at timestamptz not null default now(),
 check((achievement_id is not null) <> (statistic_id is not null))
);
alter table public.athlete_evidence_reviews enable row level security;
create policy "Athletes manage own evidence submissions" on public.athlete_evidence_reviews for select to authenticated using(athlete_id=(select auth.uid()) or private.is_sport_admin());
create policy "Athletes submit evidence" on public.athlete_evidence_reviews for insert to authenticated with check(athlete_id=(select auth.uid()) and submitted_by=(select auth.uid()));
create policy "Admins review evidence" on public.athlete_evidence_reviews for update to authenticated using(private.is_sport_admin()) with check(private.is_sport_admin());
grant select,insert,update on public.athlete_evidence_reviews to authenticated;

create table if not exists public.athlete_endorsements (
 id uuid primary key default gen_random_uuid(),
 athlete_id uuid not null references public.profiles(id) on delete cascade,
 endorser_id uuid not null references public.profiles(id) on delete restrict,
 organisation_id uuid references public.organisations(id) on delete set null,
 relationship_title text not null,
 sport text,
 playing_period text,
 endorsement_text text not null check(length(trim(endorsement_text)) between 20 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','withdrawn')),
 verified_by uuid references public.profiles(id) on delete set null,
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.athlete_endorsements enable row level security;
create policy "Athletes read own endorsements" on public.athlete_endorsements for select to authenticated using(athlete_id=(select auth.uid()) or endorser_id=(select auth.uid()) or status='approved' or private.is_sport_admin());
create policy "Members request endorsements" on public.athlete_endorsements for insert to authenticated with check(endorser_id=(select auth.uid()));
create policy "Endorser or athlete manage endorsement" on public.athlete_endorsements for update to authenticated using(endorser_id=(select auth.uid()) or athlete_id=(select auth.uid()) or private.is_sport_admin()) with check(endorser_id=(select auth.uid()) or athlete_id=(select auth.uid()) or private.is_sport_admin());
grant select,insert,update on public.athlete_endorsements to authenticated;

create table if not exists public.scout_lists (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 description text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.scout_prospects (
 id uuid primary key default gen_random_uuid(),
 list_id uuid not null references public.scout_lists(id) on delete cascade,
 athlete_id uuid not null references public.profiles(id) on delete cascade,
 stage text not null default 'new' check(stage in ('new','watching','contacted','trial','shortlisted','signed','archived')),
 rating numeric(4,1),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(list_id,athlete_id)
);
create table if not exists public.scout_shortlist_notes (
 id uuid primary key default gen_random_uuid(),
 scout_id uuid not null references public.profiles(id) on delete cascade,
 athlete_id uuid not null references public.profiles(id) on delete cascade,
 note text not null check(length(trim(note)) between 1 and 4000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.scout_lists enable row level security;
alter table public.scout_prospects enable row level security;
alter table public.scout_shortlist_notes enable row level security;
create policy "Scouts manage lists" on public.scout_lists for all to authenticated using(owner_id=(select auth.uid()) or private.is_sport_admin()) with check(owner_id=(select auth.uid()) or private.is_sport_admin());
create policy "Scouts manage prospects" on public.scout_prospects for all to authenticated using(exists(select 1 from public.scout_lists l where l.id=list_id and (l.owner_id=(select auth.uid()) or private.is_sport_admin()))) with check(exists(select 1 from public.scout_lists l where l.id=list_id and (l.owner_id=(select auth.uid()) or private.is_sport_admin())));
create policy "Scouts manage shortlist notes" on public.scout_shortlist_notes for all to authenticated using(scout_id=(select auth.uid()) or private.is_sport_admin()) with check(scout_id=(select auth.uid()) or private.is_sport_admin());
grant select,insert,update,delete on public.scout_lists,public.scout_prospects,public.scout_shortlist_notes to authenticated;

create table if not exists public.compliance_consents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 consent_type text not null,
 version text not null,
 granted boolean not null,
 granted_at timestamptz,
 withdrawn_at timestamptz,
 source text not null default 'web',
 created_at timestamptz not null default now()
);
create index if not exists compliance_consents_user_idx on public.compliance_consents(user_id,consent_type,created_at desc);
alter table public.compliance_consents enable row level security;
create policy "Users read own compliance consents" on public.compliance_consents for select to authenticated using(user_id=(select auth.uid()) or private.is_sport_admin());
create policy "Users record own compliance consents" on public.compliance_consents for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Users update own compliance consents" on public.compliance_consents for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update on public.compliance_consents to authenticated;

create table if not exists public.adult_attestations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.profiles(id) on delete cascade,
 attested_adult boolean not null,
 attested_at timestamptz not null default now(),
 policy_version text not null,
 ip_hash text,
 user_agent text
);
alter table public.adult_attestations enable row level security;
create policy "Users read own adult attestation" on public.adult_attestations for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.adult_attestations from authenticated;
grant select on public.adult_attestations to authenticated;

create table if not exists public.data_export_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'requested' check(status in ('requested','processing','completed','failed')),
 requested_at timestamptz not null default now(),
 completed_at timestamptz,
 export_path text,
 error_message text
);
create table if not exists public.account_deletion_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'requested' check(status in ('requested','approved','processing','completed','rejected')),
 requested_at timestamptz not null default now(),
 processed_at timestamptz,
 reason text
);
alter table public.data_export_requests enable row level security;
alter table public.account_deletion_requests enable row level security;
create policy "Users read export requests" on public.data_export_requests for select to authenticated using(user_id=(select auth.uid()) or private.is_sport_admin());
create policy "Users request export" on public.data_export_requests for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Users read deletion requests" on public.account_deletion_requests for select to authenticated using(user_id=(select auth.uid()) or private.is_sport_admin());
create policy "Users request deletion" on public.account_deletion_requests for insert to authenticated with check(user_id=(select auth.uid()));
grant select,insert on public.data_export_requests,public.account_deletion_requests to authenticated;

create or replace function public.request_my_data_export()
returns uuid language plpgsql security invoker set search_path=public as $$
declare rid uuid;
begin
 insert into public.data_export_requests(user_id) values((select auth.uid())) returning id into rid;
 return rid;
end; $$;
grant execute on function public.request_my_data_export() to authenticated;

create or replace function public.request_account_deletion(reason_text text default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare rid uuid;
begin
 insert into public.account_deletion_requests(user_id,reason) values((select auth.uid()),reason_text) returning id into rid;
 return rid;
end; $$;
grant execute on function public.request_account_deletion(text) to authenticated;
