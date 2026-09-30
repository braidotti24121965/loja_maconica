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
