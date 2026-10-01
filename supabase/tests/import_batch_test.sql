begin;

do $test$
declare
  v_admin_id uuid := pg_catalog.gen_random_uuid();
  v_member_id uuid := pg_catalog.gen_random_uuid();
  v_tenant_id uuid;
  v_store_id uuid;
  v_other_store_id uuid;
  v_brother_id uuid;
  v_other_brother_id uuid;
  v_payload jsonb;
begin
  -- Configura usuários de teste
  insert into auth.users (id, email)
  values 
    (v_admin_id, 'import-admin-' || v_admin_id::text || '@example.invalid'),
    (v_member_id, 'import-member-' || v_member_id::text || '@example.invalid');

  insert into public.tenants (name, slug)
  values ('Tenant teste importacao', 'tenant-imp-' || replace(v_admin_id::text, '-', ''))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja Import A', true)
  returning id into v_store_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja Import B', true)
  returning id into v_other_store_id;

  insert into public.store_memberships (store_id, user_id, role)
  values 
    (v_store_id, v_admin_id, 'admin'),
    (v_store_id, v_member_id, 'member');

  insert into public.brothers (store_id, full_name, degree, created_by)
  values (v_store_id, 'Irmão Import', 'Mestre Maçom', v_admin_id)
  returning id into v_brother_id;

  insert into public.brothers (store_id, full_name, degree, created_by)
  values (v_other_store_id, 'Irmão Outra Loja', 'Aprendiz', v_admin_id)
  returning id into v_other_brother_id;

  -- =========================================================================
  -- TESTE 1: import_members_batch
  -- =========================================================================

  -- 1.1 Membro comum não pode importar membros
  perform set_config('request.jwt.claims', json_build_object('sub', v_member_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_member_id::text, true);

  v_payload := json_build_array(
    json_build_object('full_name', 'Novo Irmao 1', 'cim', '9900001', 'degree', 'Aprendiz', 'phone', '')
  );

  begin
    perform public.import_members_batch(v_store_id, v_member_id, v_payload, 'membros.csv', 'hash1');
    raise exception 'Falha: membro comum conseguiu importar membros';
  exception
    when insufficient_privilege then null;
  end;

  -- 1.2 Admin não pode falsificar p_user_id
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  begin
    perform public.import_members_batch(v_store_id, v_member_id, v_payload, 'membros.csv', 'hash1');
    raise exception 'Falha: admin conseguiu passar p_user_id divergente';
  exception
    when insufficient_privilege then null;
  end;

  -- 1.3 Admin importa membros com sucesso
  perform public.import_members_batch(v_store_id, v_admin_id, v_payload, 'membros.csv', 'hash1');

  if not exists (
    select 1 from public.brothers where store_id = v_store_id and cim = '9900001' and full_name = 'Novo Irmao 1'
  ) then
    raise exception 'Falha: membro importado não foi inserido corretamente';
  end if;

  if not exists (
    select 1 from public.import_logs where store_id = v_store_id and user_id = v_admin_id and import_type = 'members'
  ) then
    raise exception 'Falha: log de importação de membros não foi registrado';
  end if;

  -- 1.4 Rejeita CIM duplicado na mesma loja
  begin
    perform public.import_members_batch(v_store_id, v_admin_id, v_payload, 'membros2.csv', 'hash2');
    raise exception 'Falha: permitiu importar CIM duplicado na mesma loja';
  exception
    when unique_violation then null;
  end;

  -- =========================================================================
  -- TESTE 2: import_dues_batch
  -- =========================================================================

  -- 2.1 Rejeita mensalidade para irmão de outra loja
  v_payload := json_build_array(
    json_build_object(
      'brother_id', v_other_brother_id,
      'competence', '2099-05',
      'due_date', '2099-05-10',
      'amount', 150,
      'status', 'pending'
    )
  );

  begin
    perform public.import_dues_batch(v_store_id, v_admin_id, v_payload, 'dues_err.csv', 'hash_err');
    raise exception 'Falha: aceitou mensalidade para obreiro de outra loja';
  exception
    when foreign_key_violation then null;
  end;

  -- 2.2 Importa mensalidade válida com sucesso
  v_payload := json_build_array(
    json_build_object(
      'brother_id', v_brother_id,
      'competence', '2099-05',
      'due_date', '2099-05-10',
      'amount', 150,
      'status', 'pending'
    )
  );

  perform public.import_dues_batch(v_store_id, v_admin_id, v_payload, 'dues_ok.csv', 'hash_ok');

  if not exists (
    select 1 from public.monthly_dues where store_id = v_store_id and brother_id = v_brother_id and competence = '2099-05'
  ) then
    raise exception 'Falha: mensalidade importada não foi inserida';
  end if;

  if not exists (
    select 1 from public.import_logs where store_id = v_store_id and user_id = v_admin_id and import_type = 'dues'
  ) then
    raise exception 'Falha: log de importação de mensalidades não foi registrado';
  end if;

  -- 2.3 Rejeita competência duplicada para o mesmo irmão
  begin
    perform public.import_dues_batch(v_store_id, v_admin_id, v_payload, 'dues_dup.csv', 'hash_dup');
    raise exception 'Falha: permitiu mensalidade duplicada para mesma competência';
  exception
    when unique_violation then null;
  end;

  raise notice 'SUCESSO: import_batch_test validou autorizacao, verificacao de loja, logs e integridade';
end;
$test$;

rollback;
