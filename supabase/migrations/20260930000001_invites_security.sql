-- Fase 3.2: convites vinculados à identidade, revogáveis e de uso único.

alter table public.store_invites
  add column email text,
  add column revoked_at timestamptz,
  add column revoked_by uuid references auth.users(id),
  add column accepted_by uuid references auth.users(id);

-- Convites legados sem destinatário não podem continuar utilizáveis.
update public.store_invites
set revoked_at = now(), revoked_by = created_by
where email is null and used_at is null;

alter table public.store_invites
  add constraint store_invites_email_normalized_check
  check (email is null or email = lower(trim(email))),
  add constraint store_invites_active_email_check
  check (email is not null or used_at is not null or revoked_at is not null),
  add constraint store_invites_terminal_state_check
  check (not (used_at is not null and revoked_at is not null));

create index store_invites_pending_idx
  on public.store_invites(store_id, expires_at)
  where used_at is null and revoked_at is null;

create or replace function private.can_issue_store_role(
  target_store_id uuid,
  target_role public.store_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = target_store_id
      and sm.user_id = (select auth.uid())
      and (
        sm.role = 'admin'
        or (sm.role = 'secretary' and target_role in ('treasurer', 'member', 'viewer'))
      )
  )
$$;

revoke execute on function private.can_issue_store_role(uuid, public.store_role)
from public, anon;
grant execute on function private.can_issue_store_role(uuid, public.store_role)
to authenticated;

drop policy if exists store_invites_insert on public.store_invites;
create policy store_invites_insert on public.store_invites
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and email is not null
    and email = lower(trim(email))
    and private.can_issue_store_role(store_id, role)
  );

create or replace function private.protect_store_invite_revocation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.used_at is not null or old.revoked_at is not null then
    raise exception 'invite is no longer pending';
  end if;

  if new.id is distinct from old.id
    or new.store_id is distinct from old.store_id
    or new.token is distinct from old.token
    or new.role is distinct from old.role
    or new.email is distinct from old.email
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'invite identity cannot be changed';
  end if;

  -- Transição de aceite, executada pela função accept_invite.
  if new.used_at is not null
    and new.accepted_by = (select auth.uid())
    and new.revoked_at is null
    and new.revoked_by is null then
    return new;
  end if;

  -- Transição de revogação, executada pela ação administrativa.
  if new.used_at is null
    and new.accepted_by is null
    and new.revoked_at is not null
    and new.revoked_by = (select auth.uid()) then
    return new;
  end if;

  raise exception 'only invite acceptance or revocation is allowed';
end;
$$;

revoke execute on function private.protect_store_invite_revocation()
from public, anon, authenticated;

create trigger protect_store_invite_revocation
before update on public.store_invites
for each row execute function private.protect_store_invite_revocation();

create policy store_invites_update on public.store_invites
  for update to authenticated
  using (
    used_at is null
    and revoked_at is null
    and private.can_issue_store_role(store_id, role)
  )
  with check (
    revoked_at is not null
    and revoked_by = (select auth.uid())
    and private.can_issue_store_role(store_id, role)
  );

drop policy if exists store_invites_delete on public.store_invites;

create or replace function public.accept_invite(invite_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.store_invites%rowtype;
  v_uid uuid := (select auth.uid());
  v_email text := lower(trim(coalesce((select auth.jwt() ->> 'email'), '')));
begin
  if v_uid is null or v_email = '' then
    return false;
  end if;

  select * into v_invite
  from public.store_invites
  where token = invite_token
  for update;

  if not found
    or v_invite.email is null
    or v_invite.used_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= now()
    or v_invite.email <> v_email then
    return false;
  end if;

  insert into public.store_memberships (store_id, user_id, role)
  values (v_invite.store_id, v_uid, v_invite.role)
  on conflict (store_id, user_id) do update set role = excluded.role;

  update public.store_invites
  set used_at = now(), accepted_by = v_uid
  where id = v_invite.id;

  return true;
end;
$$;

revoke all on function public.accept_invite(uuid) from public, anon;
grant execute on function public.accept_invite(uuid) to authenticated;
