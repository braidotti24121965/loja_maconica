-- Tabela de auditoria de importações em lote
CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  import_type text NOT NULL CHECK (import_type IN ('members', 'dues')),
  file_name text NOT NULL,
  file_hash text,
  total_rows int NOT NULL DEFAULT 0,
  imported_rows int NOT NULL DEFAULT 0,
  rejected_rows int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_import_logs_store_id ON public.import_logs(store_id);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_logs_select ON public.import_logs
  FOR SELECT TO authenticated
  USING (private.is_store_member(store_id));

-- Função RPC para importação transacional de membros
CREATE OR REPLACE FUNCTION public.import_members_batch(
  p_store_id uuid,
  p_user_id uuid,
  p_members jsonb,
  p_file_name text,
  p_file_hash text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_member jsonb;
  v_total int;
BEGIN
  -- Verify admin role
  IF NOT private.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas Administradores ou Secretários podem importar membros.';
  END IF;

  v_total := jsonb_array_length(p_members);

  -- Insert Log
  INSERT INTO public.import_logs (store_id, user_id, import_type, file_name, file_hash, total_rows, imported_rows, rejected_rows)
  VALUES (p_store_id, p_user_id, 'members', p_file_name, p_file_hash, v_total, v_total, 0)
  RETURNING id INTO v_log_id;

  -- Process items
  FOR v_member IN SELECT * FROM jsonb_array_elements(p_members)
  LOOP
    -- check if cim exists
    IF v_member->>'cim' IS NOT NULL AND (v_member->>'cim') <> '' THEN
      IF EXISTS (SELECT 1 FROM public.brothers WHERE store_id = p_store_id AND cim = v_member->>'cim') THEN
        RAISE EXCEPTION 'CIM % já cadastrado nesta loja. Importação abortada.', v_member->>'cim';
      END IF;
    END IF;

    INSERT INTO public.brothers (store_id, full_name, cim, degree, phone, created_by)
    VALUES (
      p_store_id,
      v_member->>'full_name',
      NULLIF(v_member->>'cim', ''),
      v_member->>'degree',
      NULLIF(v_member->>'phone', ''),
      p_user_id
    );
  END LOOP;
END;
$$;

-- Função RPC para importação transacional de mensalidades
CREATE OR REPLACE FUNCTION public.import_dues_batch(
  p_store_id uuid,
  p_user_id uuid,
  p_dues jsonb,
  p_file_name text,
  p_file_hash text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_due jsonb;
  v_total int;
  v_brother_id uuid;
  v_status text;
  v_amount numeric;
  v_due_date date;
  v_payment_date date;
  v_payment_method text;
BEGIN
  -- Verify treasurer role
  IF NOT private.is_store_treasurer(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas Administradores ou Tesoureiros podem importar mensalidades.';
  END IF;

  v_total := jsonb_array_length(p_dues);

  -- Insert Log
  INSERT INTO public.import_logs (store_id, user_id, import_type, file_name, file_hash, total_rows, imported_rows, rejected_rows)
  VALUES (p_store_id, p_user_id, 'dues', p_file_name, p_file_hash, v_total, v_total, 0)
  RETURNING id INTO v_log_id;

  -- Process items
  FOR v_due IN SELECT * FROM jsonb_array_elements(p_dues)
  LOOP
    v_brother_id := (v_due->>'brother_id')::uuid;
    v_status := v_due->>'status';
    v_amount := (v_due->>'amount')::numeric;
    v_due_date := (v_due->>'due_date')::date;
    
    IF (v_due->>'payment_date') IS NOT NULL AND (v_due->>'payment_date') <> '' THEN
      v_payment_date := (v_due->>'payment_date')::date;
    ELSE
      v_payment_date := NULL;
    END IF;

    v_payment_method := NULLIF(v_due->>'payment_method', '');

    IF EXISTS (SELECT 1 FROM public.monthly_dues WHERE store_id = p_store_id AND brother_id = v_brother_id AND competence = v_due->>'competence') THEN
      RAISE EXCEPTION 'Mensalidade % para obreiro id % já cadastrada. Importação abortada.', v_due->>'competence', v_brother_id;
    END IF;

    INSERT INTO public.monthly_dues (
      store_id, brother_id, competence, due_date, amount, status, payment_date, payment_method
    ) VALUES (
      p_store_id, v_brother_id, v_due->>'competence', v_due_date, v_amount, v_status, v_payment_date, v_payment_method
    );
  END LOOP;
END;
$$;
