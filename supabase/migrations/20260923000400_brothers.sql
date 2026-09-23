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
