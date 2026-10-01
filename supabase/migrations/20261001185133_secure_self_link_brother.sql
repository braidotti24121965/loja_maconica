create or replace function public.link_own_user_to_brother(
  p_store_id uuid,
  p_brother_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_updated integer;
begin
  if v_user_id is null or p_store_id is null or p_brother_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.store_memberships
    where store_id = p_store_id and user_id = v_user_id
  ) then
    raise exception 'not a store member' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.brothers
    where store_id = p_store_id and user_id = v_user_id
  ) then
    raise exception 'user already linked in store' using errcode = '23505';
  end if;

  update public.brothers
  set user_id = v_user_id
  where id = p_brother_id
    and store_id = p_store_id
    and user_id is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.link_own_user_to_brother(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.link_own_user_to_brother(uuid, uuid)
to authenticated;
