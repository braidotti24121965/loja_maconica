-- 1. Preservar dados e tabelas (Idempotência sem DROP TABLE CASCADE)
CREATE TABLE IF NOT EXISTS public.digital_cards (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL,
  brother_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT pg_catalog.now(),
  revoked_at timestamptz
);

-- 2. Limpar constraints (na ordem correta de dependência) para garantir a nova arquitetura
ALTER TABLE public.digital_cards DROP CONSTRAINT IF EXISTS fk_digital_cards_brother;
ALTER TABLE public.digital_cards DROP CONSTRAINT IF EXISTS chk_status_revoked;
ALTER TABLE public.brothers DROP CONSTRAINT IF EXISTS brothers_store_id_id_key;

-- Recriar constraints
ALTER TABLE public.brothers ADD CONSTRAINT brothers_store_id_id_key UNIQUE (store_id, id);
ALTER TABLE public.digital_cards ADD CONSTRAINT fk_digital_cards_brother FOREIGN KEY (store_id, brother_id) REFERENCES public.brothers(store_id, id) ON DELETE CASCADE;

ALTER TABLE public.digital_cards ADD CONSTRAINT chk_status_revoked CHECK (
  (status = 'active' AND revoked_at IS NULL) OR 
  (status = 'revoked' AND revoked_at IS NOT NULL)
);

DROP INDEX IF EXISTS public.idx_one_active_card;
CREATE UNIQUE INDEX idx_one_active_card ON public.digital_cards(brother_id) WHERE status = 'active';

DROP INDEX IF EXISTS public.idx_digital_cards_store_id;
CREATE INDEX idx_digital_cards_store_id ON public.digital_cards(store_id);

ALTER TABLE public.digital_cards ENABLE ROW LEVEL SECURITY;

-- 3. Restringir Leitura: Administradores NÃO podem ler tokens de outros membros, apenas o dono.
DROP POLICY IF EXISTS digital_cards_select ON public.digital_cards;
CREATE POLICY digital_cards_select ON public.digital_cards
  FOR SELECT TO authenticated
  USING (
    brother_id IN (SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.digital_cards.store_id)
  );

-- 4. Função: Gerar Carteirinha
CREATE OR REPLACE FUNCTION public.generate_digital_card(
  p_store_id uuid,
  p_brother_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_authorized boolean := false;
  v_new_token text;
BEGIN
  -- Somente o dono pode gerar a própria carteirinha
  IF EXISTS (SELECT 1 FROM public.brothers WHERE id = p_brother_id AND store_id = p_store_id AND user_id = auth.uid()) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Acesso negado: você só pode gerar a sua própria carteirinha.';
  END IF;

  -- Revoga
  UPDATE public.digital_cards 
  SET status = 'revoked', revoked_at = pg_catalog.now() 
  WHERE brother_id = p_brother_id AND store_id = p_store_id AND status = 'active';

  -- Gerar 32 bytes usando pgcrypto (presente em extensions no Supabase)
  v_new_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  -- Insere nova
  INSERT INTO public.digital_cards (store_id, brother_id, token, status)
  VALUES (p_store_id, p_brother_id, v_new_token, 'active');

  RETURN v_new_token;
END;
$$;

-- Revogar TUDO antes do Grant
REVOKE ALL ON FUNCTION public.generate_digital_card(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_digital_card(uuid, uuid) TO authenticated;

-- 5. Função: Revogar Carteirinha
CREATE OR REPLACE FUNCTION public.revoke_digital_card(
  p_store_id uuid,
  p_brother_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_authorized boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.brothers WHERE id = p_brother_id AND store_id = p_store_id AND user_id = auth.uid()) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Acesso negado: você só pode revogar a sua própria carteirinha.';
  END IF;

  UPDATE public.digital_cards 
  SET status = 'revoked', revoked_at = pg_catalog.now() 
  WHERE brother_id = p_brother_id AND store_id = p_store_id AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_digital_card(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_digital_card(uuid, uuid) TO authenticated;

-- 6. Função: Validação Pública Segura (Sem CIM, Sem bypass)
CREATE OR REPLACE FUNCTION public.validate_digital_card(p_token text)
RETURNS pg_catalog.json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_card record;
  v_result pg_catalog.json;
  v_short_name text;
  v_parts text[];
BEGIN
  SELECT 
    dc.status, b.full_name, s.name as store_name
  INTO v_card
  FROM public.digital_cards dc
  JOIN public.brothers b ON b.id = dc.brother_id
  JOIN public.stores s ON s.id = dc.store_id
  WHERE dc.token = p_token;

  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_card.status = 'revoked' THEN
    RETURN pg_catalog.json_build_object('status', 'revoked');
  END IF;

  v_parts := pg_catalog.string_to_array(v_card.full_name, ' ');
  IF pg_catalog.array_length(v_parts, 1) > 1 THEN
    v_short_name := v_parts[1] || ' ' || pg_catalog.substring(v_parts[pg_catalog.array_length(v_parts, 1)], 1, 1) || '.';
  ELSE
    v_short_name := v_card.full_name;
  END IF;

  v_result := pg_catalog.json_build_object(
    'status', v_card.status,
    'short_name', v_short_name,
    'store_name', v_card.store_name
  );

  RETURN v_result;
END;
$$;

-- REVOGA TUDO (Somente será chamado pela Service Role no servidor Next.js)
REVOKE ALL ON FUNCTION public.validate_digital_card(text) FROM PUBLIC, anon, authenticated;
