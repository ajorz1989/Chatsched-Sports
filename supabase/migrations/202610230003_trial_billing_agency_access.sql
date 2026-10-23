-- Commercial gating and agency access for premium Sport services.
alter table public.sport_trial_sessions
  add column if not exists billing_status text not null default 'unpaid',
  add column if not exists paid_at timestamptz,
  add constraint sport_trial_billing_status_check check(billing_status in ('unpaid','pending','paid','refunded'));

create or replace function private.guard_trial_publish_payment()
returns trigger language plpgsql security invoker set search_path=public,private
as $$
begin
 if new.status='published' and new.billing_status<>'paid' and not private.is_sport_admin() then
   raise exception 'Trial-day payment must be confirmed before publishing.';
 end if;
 return new;
end; $$;
revoke all on function private.guard_trial_publish_payment() from public,anon,authenticated;
create trigger guard_trial_publish_payment before insert or update of status,billing_status on public.sport_trial_sessions for each row execute function private.guard_trial_publish_payment();

create policy "Assigned agency agents read support requests"
 on public.career_support_requests for select to authenticated
 using(assigned_agent_id=(select auth.uid()) or private.is_sport_admin());
create policy "Assigned agency agents update support requests"
 on public.career_support_requests for update to authenticated
 using(assigned_agent_id=(select auth.uid()) or private.is_sport_admin())
 with check(assigned_agent_id=(select auth.uid()) or private.is_sport_admin());
grant select,update on public.career_support_requests to authenticated;
