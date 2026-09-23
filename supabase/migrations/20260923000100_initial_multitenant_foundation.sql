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
