-- Migration para Sistema de Convites

create table public.store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  role public.store_role not null default 'member',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

create index store_invites_store_id_idx on public.store_invites(store_id);
create index store_invites_token_idx on public.store_invites(token);

alter table public.store_invites enable row level security;

-- Somente admins da loja podem ver ou gerar convites
create policy store_invites_select on public.store_invites 
  for select to authenticated 
  using (private.is_store_admin(store_id));

create policy store_invites_insert on public.store_invites 
  for insert to authenticated 
  with check (private.is_store_admin(store_id) and created_by = (select auth.uid()));

-- Função Helper para validar e usar convite (security definer para bypassar RLS na leitura do token e criação do membro)
create or replace function public.accept_invite(invite_token uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.store_invites%rowtype;
begin
  -- Buscar convite válido
  select * into v_invite 
  from public.store_invites 
  where token = invite_token 
    and used_at is null 
    and expires_at > now();
    
  if not found then
    return false;
  end if;

  -- Criar vínculo
  insert into public.store_memberships (store_id, user_id, role)
  values (v_invite.store_id, (select auth.uid()), v_invite.role)
  on conflict (store_id, user_id) do update set role = v_invite.role;

  -- Marcar como usado
  update public.store_invites 
  set used_at = now() 
  where id = v_invite.id;

  return true;
end;
$$;

revoke all on function public.accept_invite(uuid) from anon, public;
grant execute on function public.accept_invite(uuid) to authenticated;
