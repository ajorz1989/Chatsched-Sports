-- Phase 3.1: secure reference invite redemption through an authenticated, narrowly-scoped function.
create or replace function public.accept_reference_invite(target_invite uuid, raw_token text)
returns uuid
language plpgsql
security definer
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

  if exists(
    select 1 from public.athlete_reference_requests
    where id=request_id_value and athlete_id=(select auth.uid())
  ) then
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
