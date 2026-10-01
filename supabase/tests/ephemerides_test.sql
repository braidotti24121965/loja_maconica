begin;

-- Ativa o papel authenticated para que as políticas RLS sejam estritamente aplicadas
set local role authenticated;

do $test$
declare
  v_admin_id uuid := pg_catalog.gen_random_uuid();
  v_member_id uuid := pg_catalog.gen_random_uuid();
  v_saas_admin_id uuid := pg_catalog.gen_random_uuid();
  v_tenant_id uuid;
  v_store_id uuid;
  v_brother_id uuid;
  v_eph_store_id uuid;
  v_eph_global_id uuid;
  v_count int;
begin
  -- Configura usuários temporários
  insert into auth.users (id, email)
  values 
    (v_admin_id, 'eph-admin-' || v_admin_id::text || '@example.invalid'),
    (v_member_id, 'eph-member-' || v_member_id::text || '@example.invalid'),
    (v_saas_admin_id, 'eph-saas-' || v_saas_admin_id::text || '@example.invalid');

  insert into public.platform_admins (user_id) values (v_saas_admin_id);

  insert into public.tenants (name, slug)
  values ('Tenant Efemérides', 'tenant-eph-' || replace(v_admin_id::text, '-', ''))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja Efemérides A', true)
  returning id into v_store_id;

  insert into public.store_memberships (store_id, user_id, role)
  values 
    (v_store_id, v_admin_id, 'admin'),
    (v_store_id, v_member_id, 'member');

  -- Insere um irmão com datas de aniversário e iniciação
  insert into public.brothers (
    store_id, full_name, degree, birthdate, initiation_date, created_by
  ) values (
    v_store_id, 'Irmão Aniversariante', 'Mestre Maçom', date '1985-10-15', date '2015-05-20', v_admin_id
  ) returning id into v_brother_id;

  -- 1. Teste: Membro comum NÃO pode inserir efeméride global (store_id IS NULL)
  perform set_config('request.jwt.claims', json_build_object('sub', v_member_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_member_id::text, true);

  begin
    insert into public.ephemerides (title, day, month, category, created_by)
    values ('Efeméride Global Ilegal', 20, 8, 'masonic_history', v_member_id);
    raise exception 'Falha: membro comum conseguiu criar efeméride global';
  exception
    when insufficient_privilege or check_violation or with_check_option_violation or others then null;
  end;

  -- 2. Teste: Membro comum NÃO pode inserir efeméride local na loja -> REJEITA
  begin
    insert into public.ephemerides (store_id, title, day, month, category, created_by)
    values (v_store_id, 'Efeméride Local Ilegal', 14, 10, 'store_anniversary', v_member_id);
    raise exception 'Falha: membro comum conseguiu criar efeméride local';
  exception
    when insufficient_privilege or check_violation or with_check_option_violation or others then null;
  end;

  -- 3. Teste: SaaS Admin pode criar efeméride global (store_id IS NULL) -> PERMITE
  perform set_config('request.jwt.claims', json_build_object('sub', v_saas_admin_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_saas_admin_id::text, true);

  insert into public.ephemerides (title, day, month, category, created_by)
  values ('Dia do Maçom', 20, 8, 'masonic_history', v_saas_admin_id)
  returning id into v_eph_global_id;

  -- 4. Teste: Store Admin (Venerável / Secretário) pode criar efeméride local na sua loja -> PERMITE
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  insert into public.ephemerides (store_id, title, day, month, category, created_by)
  values (v_store_id, 'Fundação da Loja', 14, 10, 'store_anniversary', v_admin_id)
  returning id into v_eph_store_id;

  -- 5. Teste: Membro da loja chama RPC get_upcoming_ephemerides
  perform set_config('request.jwt.claims', json_build_object('sub', v_member_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_member_id::text, true);

  select count(*) into v_count
  from public.get_upcoming_ephemerides(v_store_id, 30);

  if v_count <> 4 then
    raise exception 'Falha: RPC get_upcoming_ephemerides esperava 4 itens, retornou %', v_count;
  end if;

  raise notice 'SUCESSO: ephemerides_test validou RLS, bloqueio de membros comuns e permissões de secretários/administradores';
end;
$test$;

rollback;
