-- Baixa atômica de mensalidade com isolamento por loja e validação de permissões.
create or replace function public.pay_monthly_due(
  p_due_id uuid,
  p_store_id uuid,
  p_payment_method text,
  p_payment_date date,
  p_account_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due public.monthly_dues%rowtype;
  v_category_id uuid;
  v_transaction_id uuid;
begin
  -- 1. Valida usuário autenticado e papel de tesoureiro/admin na loja
  if (select auth.uid()) is null
    or not private.is_store_treasurer(p_store_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- 2. Valida parâmetros de entrada
  if p_due_id is null
    or p_store_id is null
    or p_account_id is null
    or p_payment_date is null
    or pg_catalog.btrim(coalesce(p_payment_method, '')) = ''
    or pg_catalog.char_length(pg_catalog.btrim(p_payment_method)) > 80 then
    raise exception 'invalid payment data' using errcode = '22023';
  end if;

  -- 3. Busca a mensalidade com lock for update e filtro por store_id
  select md.*
  into v_due
  from public.monthly_dues as md
  where md.id = p_due_id
    and md.store_id = p_store_id
  for update;

  if not found then
    raise exception 'monthly due not found' using errcode = 'P0002';
  end if;

  -- 4. Rejeita se já estiver paga ou já tiver transação vinculada
  if v_due.status = 'paid' or v_due.transaction_id is not null then
    raise exception 'monthly due already paid' using errcode = '23505';
  end if;

  if v_due.amount <= 0 then
    raise exception 'monthly due amount must be positive' using errcode = '22023';
  end if;

  -- 5. Valida se o irmão pertence ao mesmo store_id
  if not exists (
    select 1
    from public.brothers as b
    where b.id = v_due.brother_id
      and b.store_id = p_store_id
  ) then
    raise exception 'brother does not belong to store' using errcode = '23503';
  end if;

  -- 6. Valida se a conta financeira pertence ao mesmo store_id
  if not exists (
    select 1
    from public.financial_accounts as fa
    where fa.id = p_account_id
      and fa.store_id = p_store_id
  ) then
    raise exception 'financial account not found' using errcode = 'P0002';
  end if;

  -- 7. Busca a categoria "Mensalidade" de receita vinculada ao mesmo store_id
  select fc.id
  into v_category_id
  from public.financial_categories as fc
  where fc.store_id = p_store_id
    and fc.type = 'income'
    and pg_catalog.lower(pg_catalog.btrim(fc.name)) = 'mensalidade'
  order by fc.created_at asc nulls last, fc.id asc
  limit 1;

  if v_category_id is null then
    raise exception 'monthly due category not found' using errcode = 'P0002';
  end if;

  -- 8. Insere a transação financeira no caixa da loja
  insert into public.financial_transactions (
    store_id,
    account_id,
    category_id,
    brother_id,
    type,
    amount,
    transaction_date,
    description,
    status
  )
  values (
    p_store_id,
    p_account_id,
    v_category_id,
    v_due.brother_id,
    'income',
    v_due.amount,
    p_payment_date,
    'Pagamento Mensalidade ' || v_due.competence,
    'paid'
  )
  returning id into v_transaction_id;

  -- 9. Atualiza o status da mensalidade
  update public.monthly_dues
  set status = 'paid',
      payment_date = p_payment_date,
      payment_method = pg_catalog.btrim(p_payment_method),
      transaction_id = v_transaction_id
  where id = p_due_id
    and store_id = p_store_id;

  if not found then
    raise exception 'monthly due update failed' using errcode = 'P0002';
  end if;

  -- 10. Atualiza o saldo da conta financeira
  update public.financial_accounts
  set balance = balance + v_due.amount
  where id = p_account_id
    and store_id = p_store_id;

  if not found then
    raise exception 'financial account update failed' using errcode = 'P0002';
  end if;

  return v_transaction_id;
end;
$$;

revoke all on function public.pay_monthly_due(uuid, uuid, text, date, uuid)
from public, anon;

grant execute on function public.pay_monthly_due(uuid, uuid, text, date, uuid)
to authenticated;
