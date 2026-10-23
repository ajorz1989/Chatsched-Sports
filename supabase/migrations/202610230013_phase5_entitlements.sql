-- Phase 5: server-side billing entitlements and commercial feature enforcement.
-- Paid access is determined only from a provider-confirmed active billing account.
-- No client-side field can activate a plan.

create or replace function public.sport_has_entitlement(
  target_organisation uuid,
  target_entitlement text
)
returns boolean
language sql
security invoker
set search_path=public,private
stable
as $$
  select
    private.is_sport_admin()
    or exists (
      select 1
      from public.organisations o
      join public.sport_billing_accounts b on b.organisation_id=o.id
      where o.id=target_organisation
        and o.owner_id=(select auth.uid())
        and o.verification_status='verified'
        and b.billing_status='active'
        and (
          (b.plan_code in ('club_pro','academy_pro','agency_pro') and target_entitlement in (
            'recruitment_hub',
            'reverse_matching',
            'applicant_pipeline',
            'organisation_insights',
            'trial_publishing',
            'talent_shortlisting'
          ))
          or (b.plan_code in ('academy_pro','agency_pro') and target_entitlement in (
            'advanced_opportunity_operations',
            'priority_operational_review'
          ))
          or (b.plan_code='agency_pro' and target_entitlement in (
            'agency_crm',
            'multi_client_recruitment'
          ))
        )
    );
$$;

revoke all on function public.sport_has_entitlement(uuid,text) from public,anon;
grant execute on function public.sport_has_entitlement(uuid,text) to authenticated;

-- Replace the shortlist insert/update policies so paid entitlement is enforced in the database.
drop policy if exists "Verified organisation owners can create shortlists" on public.talent_shortlists;
create policy "Active paid organisation owners can create shortlists"
on public.talent_shortlists for insert to authenticated
with check (
  created_by=(select auth.uid())
  and public.sport_has_entitlement(organisation_id,'talent_shortlisting')
  and exists (
    select 1
    from public.athlete_profiles ap
    join public.profiles p on p.id=ap.user_id
    where ap.user_id=athlete_id
      and ap.visibility='public'
      and p.account_type='athlete'
  )
);

drop policy if exists "Verified organisation owners can update their shortlists" on public.talent_shortlists;
create policy "Active paid organisation owners can update shortlists"
on public.talent_shortlists for update to authenticated
using (
  public.sport_has_entitlement(organisation_id,'talent_shortlisting')
  or private.is_sport_admin()
)
with check (
  public.sport_has_entitlement(organisation_id,'talent_shortlisting')
  or private.is_sport_admin()
);

-- Saved recruiter searches are a paid recruitment feature.
drop policy if exists "Organisation owners can create saved recruiter searches" on public.recruiter_saved_searches;
drop policy if exists "Verified organisation owners can create saved recruiter searches" on public.recruiter_saved_searches;
create policy "Active paid organisation owners can create saved recruiter searches"
on public.recruiter_saved_searches for insert to authenticated
with check (
  created_by=(select auth.uid())
  and public.sport_has_entitlement(organisation_id,'recruitment_hub')
);

drop policy if exists "Organisation owners can update saved recruiter searches" on public.recruiter_saved_searches;
drop policy if exists "Verified organisation owners can update saved recruiter searches" on public.recruiter_saved_searches;
create policy "Active paid organisation owners can update saved recruiter searches"
on public.recruiter_saved_searches for update to authenticated
using (
  public.sport_has_entitlement(organisation_id,'recruitment_hub')
  or private.is_sport_admin()
)
with check (
  public.sport_has_entitlement(organisation_id,'recruitment_hub')
  or private.is_sport_admin()
);

-- Prevent direct publishing of trial sessions unless the organisation has an active paid plan.
create or replace function private.prevent_unpaid_trial_publish()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
begin
  if new.status='published' and (
    new.billing_status is distinct from 'paid'
    or not exists (
      select 1 from public.sport_trial_slots s
      where s.trial_session_id=new.id
    )
    or not public.sport_has_entitlement(new.organisation_id,'trial_publishing')
  ) then
    raise exception 'Trial sessions require a paid organisation plan, confirmed trial payment and at least one generated slot before publishing.';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_unpaid_trial_publish() from public,anon,authenticated;

-- Admin reconciliation helper: returns only aggregate order counts, never payment payloads.
create or replace function public.sport_billing_summary(target_organisation uuid)
returns table(
  billing_status text,
  plan_code text,
  pending_orders bigint,
  paid_orders bigint,
  refunded_orders bigint
)
language sql
security invoker
set search_path=public,private
stable
as $$
  select
    b.billing_status,
    b.plan_code,
    count(*) filter (where o.status in ('pending','payment_pending'))::bigint,
    count(*) filter (where o.status='paid')::bigint,
    count(*) filter (where o.status='refunded')::bigint
  from public.sport_billing_accounts b
  left join public.sport_service_orders o on o.organisation_id=b.organisation_id
  where b.organisation_id=target_organisation
    and (
      private.is_sport_admin()
      or exists (
        select 1 from public.organisations org
        where org.id=target_organisation and org.owner_id=(select auth.uid())
      )
    )
  group by b.billing_status,b.plan_code;
$$;

revoke all on function public.sport_billing_summary(uuid) from public,anon;
grant execute on function public.sport_billing_summary(uuid) to authenticated;
