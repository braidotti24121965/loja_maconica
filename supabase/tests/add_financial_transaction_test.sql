begin;

do $test$
declare
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_tenant_id uuid;
  v_store_id uuid;
  v_other_store_id uuid;
  v_account_id uuid;
  v_other_account_id uuid;
  v_income_category_id uuid;
  v_expense_category_id uuid;
  v_brother_id uuid;
  v_transaction_id uuid;
  v_balance numeric;
  v_before_count bigint;
begin
  insert into auth.users (id, email)
  values (v_user_id, 'financial-test-' || v_user_id::text || '@example.invalid');

  insert into public.tenants (name, slug)
  values ('Tenant teste financeiro', 'financial-test-' || replace(v_user_id::text, '-', ''))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja financeira A', true)
  returning id into v_store_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja financeira B', true)
  returning id into v_other_store_id;

  insert into public.store_memberships (store_id, user_id, role)
  values (v_store_id, v_user_id, 'treasurer');

  insert into public.financial_accounts (store_id, name, balance)
  values (v_store_id, 'Conta A', 100)
  returning id into v_account_id;

  insert into public.financial_accounts (store_id, name, balance)
  values (v_other_store_id, 'Conta B', 500)
  returning id into v_other_account_id;

  insert into public.financial_categories (store_id, name, type)
  values (v_store_id, 'Doações', 'income')
  returning id into v_income_category_id;

  insert into public.financial_categories (store_id, name, type)
  values (v_store_id, 'Aluguel', 'expense')
  returning id into v_expense_category_id;

  insert into public.brothers (store_id, full_name, degree, created_by)
  values (v_store_id, 'Irmão financeiro', 'Mestre Maçom', v_user_id)
  returning id into v_brother_id;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  select count(*) into v_before_count
  from public.financial_transactions
  where store_id = v_store_id;

  update public.store_memberships
  set role = 'member'
  where store_id = v_store_id and user_id = v_user_id;

  begin
    perform public.add_financial_transaction(
      v_store_id, v_account_id, v_income_category_id, v_brother_id,
      'income', 25, date '2099-02-01', 'Tentativa sem permissão', 'paid'
    );
    raise exception 'Falha: membro comum criou lançamento';
  exception when insufficient_privilege then null;
  end;

  update public.store_memberships
  set role = 'treasurer'
  where store_id = v_store_id and user_id = v_user_id;

  begin
    perform public.add_financial_transaction(
      v_store_id, v_other_account_id, v_income_category_id, v_brother_id,
      'income', 25, date '2099-02-01', 'Conta de outra loja', 'paid'
    );
    raise exception 'Falha: conta de outra loja foi aceita';
  exception when no_data_found then null;
  end;

  begin
    perform public.add_financial_transaction(
      v_store_id, v_account_id, v_expense_category_id, v_brother_id,
      'income', 25, date '2099-02-01', 'Categoria incompatível', 'paid'
    );
    raise exception 'Falha: categoria incompatível foi aceita';
  exception when no_data_found then null;
  end;

  if (select count(*) from public.financial_transactions where store_id = v_store_id)
      <> v_before_count then
    raise exception 'Falha: tentativas inválidas deixaram transações parciais';
  end if;

  v_transaction_id := public.add_financial_transaction(
    v_store_id, v_account_id, v_income_category_id, v_brother_id,
    'income', 25, date '2099-02-01', 'Receita confirmada', 'paid'
  );

  if not exists (
    select 1 from public.financial_transactions
    where id = v_transaction_id
      and store_id = v_store_id
      and account_id = v_account_id
      and category_id = v_income_category_id
      and brother_id = v_brother_id
      and type = 'income'
      and amount = 25
      and status = 'paid'
  ) then
    raise exception 'Falha: lançamento válido não foi criado corretamente';
  end if;

  select balance into v_balance
  from public.financial_accounts
  where id = v_account_id;
  if v_balance <> 125 then
    raise exception 'Falha: saldo esperado 125, obtido %', v_balance;
  end if;

  perform public.add_financial_transaction(
    v_store_id, v_account_id, v_expense_category_id, null,
    'expense', 40, date '2099-02-02', 'Despesa pendente', 'pending'
  );

  select balance into v_balance
  from public.financial_accounts
  where id = v_account_id;
  if v_balance <> 125 then
    raise exception 'Falha: lançamento pendente alterou o saldo';
  end if;

  raise notice 'SUCESSO: add_financial_transaction validou autorização, isolamento e atomicidade';
end;
$test$;

rollback;
