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
