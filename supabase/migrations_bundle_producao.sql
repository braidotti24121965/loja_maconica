create extension if not exists pgcrypto with schema extensions;

create type public.tenant_role as enum ('owner', 'admin', 'viewer');
create type public.store_role as enum ('admin', 'secretary', 'treasurer', 'member', 'viewer');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 140),
  number text,
  city text,
  state char(2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.store_memberships (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.store_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index stores_tenant_id_idx on public.stores(tenant_id);
create index tenant_memberships_user_id_idx on public.tenant_memberships(user_id);
create index store_memberships_user_id_idx on public.store_memberships(user_id);

alter table public.tenants enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.store_memberships enable row level security;

revoke all on table public.tenants, public.stores, public.profiles, public.tenant_memberships, public.store_memberships from anon, authenticated;
grant select, insert, update, delete on table public.tenants, public.stores, public.profiles, public.tenant_memberships, public.store_memberships to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.is_tenant_member(target_tenant_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tenant_memberships tm where tm.tenant_id = target_tenant_id and tm.user_id = (select auth.uid())) $$;
create function private.is_tenant_admin(target_tenant_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tenant_memberships tm where tm.tenant_id = target_tenant_id and tm.user_id = (select auth.uid()) and tm.role in ('owner','admin')) $$;
create function private.is_store_member(target_store_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.store_memberships sm where sm.store_id = target_store_id and sm.user_id = (select auth.uid())) $$;
create function private.is_store_admin(target_store_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.store_memberships sm where sm.store_id = target_store_id and sm.user_id = (select auth.uid()) and sm.role in ('admin','secretary')) $$;

revoke execute on function private.is_tenant_member(uuid), private.is_tenant_admin(uuid), private.is_store_member(uuid), private.is_store_admin(uuid) from public, anon;
grant execute on function private.is_tenant_member(uuid), private.is_tenant_admin(uuid), private.is_store_member(uuid), private.is_store_admin(uuid) to authenticated;

create policy tenants_select on public.tenants for select to authenticated using (private.is_tenant_member(id));
create policy tenants_update on public.tenants for update to authenticated using (private.is_tenant_admin(id)) with check (private.is_tenant_admin(id));
create policy stores_select on public.stores for select to authenticated using (private.is_tenant_member(tenant_id));
create policy stores_insert on public.stores for insert to authenticated with check (private.is_tenant_admin(tenant_id));
create policy stores_update on public.stores for update to authenticated using (private.is_tenant_admin(tenant_id)) with check (private.is_tenant_admin(tenant_id));
create policy stores_delete on public.stores for delete to authenticated using (private.is_tenant_admin(tenant_id));
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy tenant_memberships_select on public.tenant_memberships for select to authenticated using (user_id = (select auth.uid()) or private.is_tenant_admin(tenant_id));
create policy tenant_memberships_insert on public.tenant_memberships for insert to authenticated with check (private.is_tenant_admin(tenant_id));
create policy tenant_memberships_update on public.tenant_memberships for update to authenticated using (private.is_tenant_admin(tenant_id)) with check (private.is_tenant_admin(tenant_id));
create policy tenant_memberships_delete on public.tenant_memberships for delete to authenticated using (private.is_tenant_admin(tenant_id));
create policy store_memberships_select on public.store_memberships for select to authenticated using (user_id = (select auth.uid()) or private.is_store_admin(store_id));
create policy store_memberships_insert on public.store_memberships for insert to authenticated with check (private.is_store_admin(store_id));
create policy store_memberships_update on public.store_memberships for update to authenticated using (private.is_store_admin(store_id)) with check (private.is_store_admin(store_id));
create policy store_memberships_delete on public.store_memberships for delete to authenticated using (private.is_store_admin(store_id));

comment on schema private is 'Funções internas de autorização; não exposto pelo Data API.';
comment on table public.tenants is 'Organizações isoladas do sistema multi-tenant.';
comment on table public.stores is 'Lojas pertencentes a um único tenant.';
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
-- Fase 3.4: Sessões e Documentos (Atas)

-- 1. Criação da tabela de Sessões
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  date date not null,
  session_type text not null, -- ex: 'Ordinária', 'Magna'
  description text,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index sessions_store_id_idx on public.sessions(store_id);
create index sessions_date_idx on public.sessions(date);

alter table public.sessions enable row level security;

-- Apenas membros da loja podem ver as sessões
create policy sessions_select on public.sessions 
  for select to authenticated 
  using (private.is_store_member(store_id));

-- Apenas admins/secretários podem criar/editar sessões
create policy sessions_insert on public.sessions 
  for insert to authenticated 
  with check (private.is_store_admin(store_id));

create policy sessions_update on public.sessions 
  for update to authenticated 
  using (private.is_store_admin(store_id))
  with check (private.is_store_admin(store_id));

create policy sessions_delete on public.sessions 
  for delete to authenticated 
  using (private.is_store_admin(store_id));


-- 2. Criação da tabela de Documentos (metadados do arquivo)
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade, -- Opcional, se o doc for uma ata
  title text not null,
  file_path text not null, -- Caminho do arquivo no bucket
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index documents_store_id_idx on public.documents(store_id);
create index documents_session_id_idx on public.documents(session_id);

alter table public.documents enable row level security;

-- Membros da loja podem ver metadados dos documentos
create policy documents_select on public.documents 
  for select to authenticated 
  using (private.is_store_member(store_id));

-- Admins/secretários podem enviar documentos
create policy documents_insert on public.documents 
  for insert to authenticated 
  with check (private.is_store_admin(store_id));

create policy documents_delete on public.documents 
  for delete to authenticated 
  using (private.is_store_admin(store_id));


-- 3. Criação do Bucket no Storage e RLS
-- O schema 'storage' e a tabela 'buckets'/'objects' já existem no Supabase.
insert into storage.buckets (id, name, public) 
values ('store_documents', 'store_documents', false)
on conflict (id) do nothing;

-- RLS para objetos no Storage:
-- "O caminho do arquivo geralmente é nomeado como: store_id/nome_do_arquivo.pdf"
-- Assim podemos validar o acesso checando se o usuário é membro do store_id extraído do path.

-- Membros da loja podem baixar (SELECT) arquivos da própria loja
create policy "Membros podem ver documentos da loja" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'store_documents' 
    and private.is_store_member( (string_to_array(name, '/'))[1]::uuid )
  );

-- Admins/secretários podem fazer upload (INSERT)
create policy "Admins podem enviar documentos da loja" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'store_documents' 
    and private.is_store_admin( (string_to_array(name, '/'))[1]::uuid )
  );

-- Admins podem deletar (DELETE)
create policy "Admins podem deletar documentos da loja" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'store_documents' 
    and private.is_store_admin( (string_to_array(name, '/'))[1]::uuid )
  );
-- Quadro de Obreiros (Cadastro de Irmãos)

create table public.brothers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  full_name text not null,
  cim text,
  degree text not null, -- Aprendiz, Companheiro, Mestre, Mestre Instalado
  phone text,
  user_id uuid references auth.users(id) on delete set null, -- Link opcional com login
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index brothers_store_id_idx on public.brothers(store_id);

alter table public.brothers enable row level security;

-- Todos os membros da loja podem ver o quadro de obreiros
create policy brothers_select on public.brothers 
  for select to authenticated 
  using (private.is_store_member(store_id));

-- Admins/Secretários podem adicionar obreiros
create policy brothers_insert on public.brothers 
  for insert to authenticated 
  with check (private.is_store_admin(store_id));

create policy brothers_update on public.brothers 
  for update to authenticated 
  using (private.is_store_admin(store_id))
  with check (private.is_store_admin(store_id));

create policy brothers_delete on public.brothers 
  for delete to authenticated 
  using (private.is_store_admin(store_id));
-- Adicionando a coluna "Cargo em Loja" na Ficha do Irmão

alter table public.brothers 
add column office text;

-- Atualizar políticas, caso o schema mude, mas não é necessário pois a política abrange a tabela.
-- Criação da tabela dependents (Familiares do Obreiro)
CREATE TABLE dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brother_id UUID NOT NULL REFERENCES brothers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  birthdate DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;

-- Políticas (Dependentes pertencem ao irmão, que pertence a uma loja)
-- Para ler, o usuário precisa ser membro da loja do irmão.
CREATE POLICY "Membros podem ver dependentes de sua loja"
  ON dependents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brothers b
      JOIN store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = auth.uid()
    )
  );

-- Para inserir/atualizar/deletar, o usuário também precisa ser membro da mesma loja.
CREATE POLICY "Membros podem gerenciar dependentes de sua loja"
  ON dependents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brothers b
      JOIN store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = auth.uid()
    )
  );

-- Criar função caso não exista
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar gatilho para updated_at
CREATE TRIGGER update_dependents_updated_at
  BEFORE UPDATE ON dependents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Fix 1: update_updated_at_column com search_path fixo
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix 2: Refatorar as políticas de dependents (separar operações e usar (select auth.uid()))
DROP POLICY IF EXISTS "Membros podem ver dependentes de sua loja" ON public.dependents;
DROP POLICY IF EXISTS "Membros podem gerenciar dependentes de sua loja" ON public.dependents;

CREATE POLICY "Membros podem ver dependentes"
  ON public.dependents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Membros podem inserir dependentes"
  ON public.dependents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Membros podem atualizar dependentes"
  ON public.dependents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Membros podem deletar dependentes"
  ON public.dependents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

-- Fix 3: Garantir search_path vazio ou restrito na accept_invite, e verificar auth.uid() nulo
CREATE OR REPLACE FUNCTION public.accept_invite(invite_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_invite public.store_invites%rowtype;
  v_uid uuid;
BEGIN
  -- Obter usuário atual de forma segura
  v_uid := (select auth.uid());
  
  if v_uid is null then
    return false;
  end if;

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
  values (v_invite.store_id, v_uid, v_invite.role)
  on conflict (store_id, user_id) do update set role = v_invite.role;

  -- Marcar como usado
  update public.store_invites 
  set used_at = now() 
  where id = v_invite.id;

  return true;
END;
$$;
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
-- Fase 3.5: Eventos e galeria privada por loja.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text check (description is null or char_length(description) <= 5000),
  event_date date not null,
  event_time time,
  location text check (location is null or char_length(location) <= 240),
  status text not null default 'published'
    check (status in ('draft', 'published', 'cancelled', 'archived')),
  deleted_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, id)
);

create index events_store_date_idx on public.events(store_id, event_date desc)
  where deleted_at is null;

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  store_id uuid not null,
  storage_path text not null unique,
  is_cover boolean not null default false,
  order_index integer not null default 0 check (order_index >= 0),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint event_photos_store_event_fk
    foreign key (store_id, event_id)
    references public.events(store_id, id)
    on delete cascade
);

create index event_photos_event_order_idx
  on public.event_photos(event_id, order_index, created_at);
create unique index event_photos_one_cover_idx
  on public.event_photos(event_id)
  where is_cover;

alter table public.events enable row level security;
alter table public.event_photos enable row level security;

create trigger update_events_updated_at
  before update on public.events
  for each row execute function public.update_updated_at_column();

create policy events_select on public.events
  for select to authenticated
  using (private.is_store_member(store_id) and deleted_at is null);
create policy events_insert on public.events
  for insert to authenticated
  with check (
    private.is_store_admin(store_id)
    and created_by = (select auth.uid())
    and deleted_at is null
  );
create policy events_update on public.events
  for update to authenticated
  using (private.is_store_admin(store_id))
  with check (private.is_store_admin(store_id));

create policy event_photos_select on public.event_photos
  for select to authenticated
  using (private.is_store_member(store_id));
create policy event_photos_insert on public.event_photos
  for insert to authenticated
  with check (
    private.is_store_admin(store_id)
    and uploaded_by = (select auth.uid())
  );
create policy event_photos_update on public.event_photos
  for update to authenticated
  using (private.is_store_admin(store_id))
  with check (private.is_store_admin(store_id));
create policy event_photos_delete on public.event_photos
  for delete to authenticated
  using (private.is_store_admin(store_id));

-- Serializa uploads do mesmo evento, limita a galeria e define a ordem.
create or replace function private.prepare_event_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.event_id::text, 0)
  );

  select count(*) into photo_count
  from public.event_photos
  where event_id = new.event_id;

  if photo_count >= 20 then
    raise exception 'event photo limit reached';
  end if;

  select coalesce(max(order_index), -1) + 1 into new.order_index
  from public.event_photos
  where event_id = new.event_id;

  if photo_count = 0 then
    new.is_cover := true;
  end if;

  return new;
end;
$$;

revoke execute on function private.prepare_event_photo()
from public, anon, authenticated;
create trigger prepare_event_photo
before insert on public.event_photos
for each row execute function private.prepare_event_photo();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store_media',
  'store_media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- O caminho obrigatório é store_id/event_id/arquivo.ext. As funções abaixo
-- validam o formato antes do cast e confirmam o evento no banco.
create or replace function private.can_read_event_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when object_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/[^/]+$' then
      exists (
        select 1 from public.events e
        where e.store_id = (pg_catalog.string_to_array(object_name, '/'))[1]::uuid
          and e.id = (pg_catalog.string_to_array(object_name, '/'))[2]::uuid
          and e.deleted_at is null
          and private.is_store_member(e.store_id)
      )
    else false
  end
$$;

create or replace function private.can_manage_event_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when object_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/[^/]+$' then
      exists (
        select 1 from public.events e
        where e.store_id = (pg_catalog.string_to_array(object_name, '/'))[1]::uuid
          and e.id = (pg_catalog.string_to_array(object_name, '/'))[2]::uuid
          and e.deleted_at is null
          and private.is_store_admin(e.store_id)
      )
    else false
  end
$$;

revoke execute on function private.can_read_event_object(text),
  private.can_manage_event_object(text) from public, anon;
grant execute on function private.can_read_event_object(text),
  private.can_manage_event_object(text) to authenticated;

create policy storage_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'store_media' and private.can_read_event_object(name));
create policy storage_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store_media' and private.can_manage_event_object(name));
create policy storage_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'store_media' and private.can_manage_event_object(name))
  with check (bucket_id = 'store_media' and private.can_manage_event_object(name));
create policy storage_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'store_media' and private.can_manage_event_object(name));
-- Garante que uma ata sempre pertence à mesma loja da sessão e que existe
-- no máximo uma ata oficial por sessão.
alter table public.sessions
  add constraint sessions_store_id_id_key unique (store_id, id);

alter table public.documents
  add constraint documents_store_session_fk
  foreign key (store_id, session_id)
  references public.sessions (store_id, id)
  on delete cascade;

create unique index documents_one_ata_per_session_idx
  on public.documents(session_id)
  where session_id is not null;

-- O upsert da ata precisa de UPDATE tanto nos metadados quanto no Storage.
create policy documents_update on public.documents
  for update to authenticated
  using (private.is_store_admin(store_id))
  with check (private.is_store_admin(store_id));

create policy "Admins podem atualizar documentos da loja" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'store_documents'
    and private.is_store_admin((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'store_documents'
    and private.is_store_admin((storage.foldername(name))[1]::uuid)
  );
