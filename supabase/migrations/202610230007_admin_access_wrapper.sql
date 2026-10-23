create or replace function public.current_user_is_sport_admin()
returns boolean language sql security invoker set search_path=public,private
as $$ select private.is_sport_admin(); $$;
revoke all on function public.current_user_is_sport_admin() from public,anon;
grant execute on function public.current_user_is_sport_admin() to authenticated;