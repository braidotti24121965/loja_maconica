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
