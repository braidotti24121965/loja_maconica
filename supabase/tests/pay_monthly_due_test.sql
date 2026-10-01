begin;

do $test$
declare
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_tenant_id uuid;
  v_store_id uuid;
  v_other_store_id uuid;
  v_brother_id uuid;
  v_account_id uuid;
  v_other_account_id uuid;
  v_due_id uuid;
  v_transaction_id uuid;
  v_balance numeric;
  v_status text;
  v_before_transactions bigint;
begin
  insert into auth.users (id, email)
  values (v_user_id, 'pay-due-test-' || v_user_id::text || '@example.invalid');

  insert into public.tenants (name, slug)
  values ('Tenant teste mensalidade', 'tenant-teste-' || replace(v_user_id::text, '-', ''))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja teste A', true)
  returning id into v_store_id;

  insert into public.stores (tenant_id, name, active)
  values (v_tenant_id, 'Loja teste B', true)
  returning id into v_other_store_id;

  insert into public.store_memberships (store_id, user_id, role)
  values (v_store_id, v_user_id, 'treasurer');

  insert into public.brothers (store_id, full_name, degree, created_by)
  values (v_store_id, 'Irmão teste', 'Mestre Maçom', v_user_id)
  returning id into v_brother_id;

  insert into public.financial_accounts (store_id, name, balance)
  values (v_store_id, 'Caixa teste', 10)
  returning id into v_account_id;

  insert into public.financial_accounts (store_id, name, balance)
  values (v_other_store_id, 'Caixa de outra loja', 50)
  returning id into v_other_account_id;

  insert into public.financial_categories (store_id, name, type)
  values (v_store_id, 'Mensalidade', 'income');

  insert into public.monthly_dues (
    store_id, brother_id, competence, due_date, amount, status
  ) values (
    v_store_id, v_brother_id, '2099-01', date '2099-01-10', 125, 'pending'
  ) returning id into v_due_id;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  select count(*) into v_before_transactions
  from public.financial_transactions
  where store_id = v_store_id;

  update public.store_memberships
  set role = 'member'
  where store_id = v_store_id and user_id = v_user_id;

  begin
    perform public.pay_monthly_due(
      v_due_id,
      v_store_id,
      'PIX',
      date '2099-01-05',
      v_account_id
    );
    raise exception 'Falha: membro comum conseguiu baixar mensalidade';
  exception
    when insufficient_privilege then null;
  end;

  update public.store_memberships
  set role = 'treasurer'
  where store_id = v_store_id and user_id = v_user_id;

  begin
    perform public.pay_monthly_due(
      v_due_id,
      v_store_id,
      'PIX',
      date '2099-01-05',
      v_other_account_id
    );
    raise exception 'Falha: conta de outra loja foi aceita';
  exception
    when no_data_found then null;
  end;

  if (select count(*) from public.financial_transactions where store_id = v_store_id)
      <> v_before_transactions then
    raise exception 'Falha: tentativa inválida deixou transação parcial';
  end if;

  select status into v_status
  from public.monthly_dues
  where id = v_due_id;
  if v_status <> 'pending' then
    raise exception 'Falha: tentativa inválida alterou a mensalidade';
  end if;

  v_transaction_id := public.pay_monthly_due(
    v_due_id,
    v_store_id,
    'PIX',
    date '2099-01-05',
    v_account_id
  );

  if not exists (
    select 1
    from public.financial_transactions
    where id = v_transaction_id
      and store_id = v_store_id
      and account_id = v_account_id
      and category_id in (
        select id from public.financial_categories
        where store_id = v_store_id and name = 'Mensalidade'
      )
      and brother_id = v_brother_id
      and amount = 125
      and status = 'paid'
  ) then
    raise exception 'Falha: transação financeira não foi criada corretamente';
  end if;

  if not exists (
    select 1
    from public.monthly_dues
    where id = v_due_id
      and status = 'paid'
      and transaction_id = v_transaction_id
      and payment_method = 'PIX'
      and payment_date = date '2099-01-05'
  ) then
    raise exception 'Falha: mensalidade não foi baixada corretamente';
  end if;

  select balance into v_balance
  from public.financial_accounts
  where id = v_account_id;
  if v_balance <> 135 then
    raise exception 'Falha: saldo esperado 135, obtido %', v_balance;
  end if;

  begin
    perform public.pay_monthly_due(
      v_due_id,
      v_store_id,
      'PIX',
      date '2099-01-05',
      v_account_id
    );
    raise exception 'Falha: mensalidade paga foi processada novamente';
  exception
    when unique_violation then null;
  end;

  raise notice 'SUCESSO: pay_monthly_due validou autorização, isolamento e atomicidade';
end;
$test$;

rollback;
