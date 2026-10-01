-- Lançamento financeiro atômico com validação integral de isolamento por loja.
create or replace function public.add_financial_transaction(
  p_store_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_brother_id uuid,
  p_type text,
  p_amount numeric,
  p_transaction_date date,
  p_description text,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction_id uuid;
begin
  if (select auth.uid()) is null
    or not private.is_store_treasurer(p_store_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_store_id is null
    or p_account_id is null
    or p_category_id is null
    or p_type not in ('income', 'expense')
    or p_status not in ('paid', 'pending')
    or p_amount is null
    or p_amount <= 0
    or p_transaction_date is null
    or pg_catalog.btrim(coalesce(p_description, '')) = ''
    or pg_catalog.char_length(pg_catalog.btrim(p_description)) > 500 then
    raise exception 'invalid transaction data' using errcode = '22023';
  end if;

  -- O lock serializa alterações de saldo na mesma conta.
  perform 1
  from public.financial_accounts as fa
  where fa.id = p_account_id
    and fa.store_id = p_store_id
  for update;

  if not found then
    raise exception 'financial account not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.financial_categories as fc
    where fc.id = p_category_id
      and fc.store_id = p_store_id
      and fc.type = p_type
  ) then
    raise exception 'financial category not found or type mismatch' using errcode = 'P0002';
  end if;

  if p_brother_id is not null and not exists (
    select 1
    from public.brothers as b
    where b.id = p_brother_id
      and b.store_id = p_store_id
  ) then
    raise exception 'brother not found' using errcode = 'P0002';
  end if;

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
  ) values (
    p_store_id,
    p_account_id,
    p_category_id,
    p_brother_id,
    p_type,
    p_amount,
    p_transaction_date,
    pg_catalog.btrim(p_description),
    p_status
  )
  returning id into v_transaction_id;

  if p_status = 'paid' then
    update public.financial_accounts
    set balance = balance + case
      when p_type = 'income' then p_amount
      else -p_amount
    end
    where id = p_account_id
      and store_id = p_store_id;

    if not found then
      raise exception 'financial account update failed' using errcode = 'P0002';
    end if;
  end if;

  return v_transaction_id;
end;
$$;

revoke all on function public.add_financial_transaction(
  uuid, uuid, uuid, uuid, text, numeric, date, text, text
) from public, anon, authenticated;

grant execute on function public.add_financial_transaction(
  uuid, uuid, uuid, uuid, text, numeric, date, text, text
) to authenticated;
