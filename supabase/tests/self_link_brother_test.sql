begin;

do $test$
declare
  v_user1_id uuid := pg_catalog.gen_random_uuid();
  v_user2_id uuid := pg_catalog.gen_random_uuid();
  v_user3_id uuid := pg_catalog.gen_random_uuid();
  v_tenant_id uuid;
  v_store_id uuid;
  v_other_store_id uuid;
  v_brother1_id uuid;
  v_brother2_id uuid;
  v_other_brother_id uuid;
  v_success boolean;
begin
  insert into auth.users (id, email)
  values 
    (v_user1_id, 'selflink-user1-' || v_user1_id::text || '@example.invalid'),
    (v_user2_id, 'selflink-user2-' || v_user2_id::text || '@example.invalid'),
    (v_user3_id, 'selflink-user3-' || v_user3_id::text || '@example.invalid');

  insert into public.tenants (name, slug)
  values ('Tenant teste selflink', 'tenant-sl-' || replace(v_user1_id::text, '-', ''))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja SelfLink A', true)
  returning id into v_store_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja SelfLink B', true)
  returning id into v_other_store_id;

  insert into public.store_memberships (store_id, user_id, role)
  values 
    (v_store_id, v_user1_id, 'member'),
    (v_store_id, v_user2_id, 'member');
    -- v_user3_id não é membro de v_store_id

  insert into public.brothers (store_id, full_name, degree, created_by)
  values 
    (v_store_id, 'Ficha Livre 1', 'Companheiro', v_user1_id)
  returning id into v_brother1_id;

  insert into public.brothers (store_id, full_name, degree, created_by)
  values 
    (v_store_id, 'Ficha Livre 2', 'Aprendiz', v_user1_id)
  returning id into v_brother2_id;

  insert into public.brothers (store_id, full_name, degree, created_by)
  values 
    (v_other_store_id, 'Ficha Outra Loja', 'Mestre', v_user1_id)
  returning id into v_other_brother_id;

  -- 1. Usuário fora da loja tenta autovinculação -> Rejeita
  perform set_config('request.jwt.claims', json_build_object('sub', v_user3_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_user3_id::text, true);

  begin
    perform public.link_own_user_to_brother(v_store_id, v_brother1_id);
    raise exception 'Falha: usuário fora da loja conseguiu se autovincular';
  exception
    when insufficient_privilege then null;
  end;

  -- 2. Membro da loja se vincula com sucesso a uma ficha livre
  perform set_config('request.jwt.claims', json_build_object('sub', v_user1_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_user1_id::text, true);

  v_success := public.link_own_user_to_brother(v_store_id, v_brother1_id);
  if not v_success then
    raise exception 'Falha: autovinculação válida retornou false';
  end if;

  if not exists (
    select 1 from public.brothers where id = v_brother1_id and user_id = v_user1_id
  ) then
    raise exception 'Falha: user_id não foi atualizado na ficha';
  end if;

  -- 3. Mesmo usuário tenta se vincular a uma SEGUNDA ficha na mesma loja -> Rejeita
  begin
    perform public.link_own_user_to_brother(v_store_id, v_brother2_id);
    raise exception 'Falha: permitiu vincular mais de uma ficha ao mesmo usuário na loja';
  exception
    when unique_violation then null;
  end;

  -- 4. Outro usuário tenta se vincular à ficha que já foi vinculada -> Retorna false (v_updated = 0)
  perform set_config('request.jwt.claims', json_build_object('sub', v_user2_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_user2_id::text, true);

  v_success := public.link_own_user_to_brother(v_store_id, v_brother1_id);
  if v_success then
    raise exception 'Falha: permitiu apropriação de ficha já vinculada';
  end if;

  -- 5. Usuário tenta vincular ficha de outra loja -> Retorna false (v_updated = 0)
  v_success := public.link_own_user_to_brother(v_store_id, v_other_brother_id);
  if v_success then
    raise exception 'Falha: permitiu vincular ficha de outra loja';
  end if;

  raise notice 'SUCESSO: self_link_brother_test validou pertencimento, unicidade e apropriação';
end;
$test$;

rollback;
