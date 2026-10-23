-- Harden trial RSVP and ownership rules.
drop policy if exists "Trial owners manage sessions" on public.sport_trial_sessions;
create policy "Trial owners manage sessions"
 on public.sport_trial_sessions for all to authenticated
 using((exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) and created_by=(select auth.uid())) or private.is_sport_admin())
 with check((exists(select 1 from public.organisations o where o.id=organisation_id and o.owner_id=(select auth.uid())) and created_by=(select auth.uid())) or private.is_sport_admin());

create or replace function public.reserve_trial_slot(target_slot uuid,target_session uuid)
returns uuid language plpgsql security invoker set search_path=public
as $$
declare
 slot_capacity integer;
 slot_count integer;
 session_capacity integer;
 session_count integer;
 new_rsvp uuid;
begin
 if not exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='athlete') then
   raise exception 'Only athlete accounts can RSVP to trial sessions';
 end if;
 if not exists(select 1 from public.sport_trial_sessions where id=target_session and status='published') then
   raise exception 'Trial session is not open for RSVP';
 end if;
 if not exists(select 1 from public.sport_trial_slots where id=target_slot and trial_session_id=target_session) then
   raise exception 'Trial slot not found';
 end if;
 select capacity into slot_capacity from public.sport_trial_slots where id=target_slot for update;
 select count(*) into slot_count from public.sport_trial_rsvps where slot_id=target_slot and status in ('reserved','checked_in');
 if slot_count>=slot_capacity then raise exception 'Trial slot is full'; end if;
 select capacity into session_capacity from public.sport_trial_sessions where id=target_session for update;
 select count(*) into session_count from public.sport_trial_rsvps where trial_session_id=target_session and status in ('reserved','checked_in') and athlete_id<>(select auth.uid());
 if session_count>=session_capacity then raise exception 'Trial session is full'; end if;
 insert into public.sport_trial_rsvps(trial_session_id,slot_id,athlete_id,status)
 values(target_session,target_slot,(select auth.uid()),'reserved')
 on conflict(trial_session_id,athlete_id) do update set slot_id=excluded.slot_id,status='reserved',updated_at=now()
 returning id into new_rsvp;
 return new_rsvp;
end; $$;
revoke all on function public.reserve_trial_slot(uuid,uuid) from public,anon;
grant execute on function public.reserve_trial_slot(uuid,uuid) to authenticated;
