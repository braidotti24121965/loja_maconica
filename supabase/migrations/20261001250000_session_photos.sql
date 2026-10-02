-- Phase 15: Photos gallery for Sessions with store_media bucket RLS
create table if not exists public.session_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  store_id uuid not null,
  storage_path text not null unique,
  order_index integer not null default 0 check (order_index >= 0),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint session_photos_store_session_fk
    foreign key (store_id, session_id)
    references public.sessions(store_id, id)
    on delete cascade
);

create index if not exists session_photos_session_order_idx
  on public.session_photos(session_id, order_index, created_at);

alter table public.session_photos enable row level security;

drop policy if exists session_photos_select on public.session_photos;
create policy session_photos_select on public.session_photos
  for select to authenticated
  using (private.is_store_member(store_id));

drop policy if exists session_photos_insert on public.session_photos;
create policy session_photos_insert on public.session_photos
  for insert to authenticated
  with check (
    private.is_store_admin(store_id)
    and uploaded_by = (select auth.uid())
  );

drop policy if exists session_photos_update on public.session_photos;
create policy session_photos_update on public.session_photos
  for update to authenticated
  using (private.is_store_admin(store_id))
  with check (private.is_store_admin(store_id));

drop policy if exists session_photos_delete on public.session_photos;
create policy session_photos_delete on public.session_photos
  for delete to authenticated
  using (private.is_store_admin(store_id));

-- Serializa uploads da mesma sessão e limita a galeria a 20 fotos
create or replace function private.prepare_session_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.session_id::text, 0)
  );

  select count(*) into photo_count
  from public.session_photos
  where session_id = new.session_id;

  if photo_count >= 20 then
    raise exception 'session photo limit reached';
  end if;

  select coalesce(max(order_index), -1) + 1 into new.order_index
  from public.session_photos
  where session_id = new.session_id;

  return new;
end;
$$;

revoke execute on function private.prepare_session_photo() from public, anon, authenticated;

drop trigger if exists prepare_session_photo on public.session_photos;
create trigger prepare_session_photo
before insert on public.session_photos
for each row execute function private.prepare_session_photo();

-- Atualiza funções de checagem do storage_media para permitir objetos de sessões
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
      or exists (
        select 1 from public.sessions s
        where s.store_id = (pg_catalog.string_to_array(object_name, '/'))[1]::uuid
          and s.id = (pg_catalog.string_to_array(object_name, '/'))[2]::uuid
          and private.is_store_member(s.store_id)
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
      or exists (
        select 1 from public.sessions s
        where s.store_id = (pg_catalog.string_to_array(object_name, '/'))[1]::uuid
          and s.id = (pg_catalog.string_to_array(object_name, '/'))[2]::uuid
          and private.is_store_admin(s.store_id)
      )
    else false
  end
$$;
