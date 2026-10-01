-- 1. Garantir vínculo seguro de loja no FK
ALTER TABLE public.brothers ADD CONSTRAINT brothers_store_id_id_key UNIQUE (store_id, id);

-- 2. Tabela para carteirinhas digitais seguras
CREATE TABLE public.digital_cards (
  id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(),
  store_id uuid NOT NULL,
  brother_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT pg_catalog.now(),
  revoked_at timestamptz,
  CONSTRAINT fk_digital_cards_brother FOREIGN KEY (store_id, brother_id) REFERENCES public.brothers(store_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_status_revoked CHECK (
    (status = 'active' AND revoked_at IS NULL) OR 
    (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

-- 3. Permitir no máximo uma carteirinha ativa por membro
CREATE UNIQUE INDEX idx_one_active_card ON public.digital_cards(brother_id) WHERE status = 'active';

CREATE INDEX idx_digital_cards_store_id ON public.digital_cards(store_id);

ALTER TABLE public.digital_cards ENABLE ROW LEVEL SECURITY;

-- 4. Membros e administradores podem LER (Ninguém pode inserir/atualizar diretamente, apenas via RPC)
CREATE POLICY digital_cards_select ON public.digital_cards
  FOR SELECT TO authenticated
  USING (
    private.is_store_admin(store_id) OR
    brother_id IN (SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.digital_cards.store_id)
  );

-- 5. RPC para geração de carteirinha (Somente o banco manipula o estado e gera o token)
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
  -- Validar permissão: o irmão dono da ficha OU o admin da loja
  IF EXISTS (SELECT 1 FROM public.brothers WHERE id = p_brother_id AND store_id = p_store_id AND user_id = auth.uid()) THEN
    v_is_authorized := true;
  ELSIF private.is_store_admin(p_store_id) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Acesso negado para gerar carteirinha.';
  END IF;

  -- Revoga qualquer carteirinha ativa
  UPDATE public.digital_cards 
  SET status = 'revoked', revoked_at = pg_catalog.now() 
  WHERE brother_id = p_brother_id AND store_id = p_store_id AND status = 'active';

  -- Gera 32 bytes hexadecimais (~64 chars) usando pgcrypto via replace de UUIDs (compatível nativamente)
  v_new_token := pg_catalog.replace(public.gen_random_uuid()::text, '-', '') || pg_catalog.replace(public.gen_random_uuid()::text, '-', '');

  -- Insere a nova
  INSERT INTO public.digital_cards (store_id, brother_id, token, status)
  VALUES (p_store_id, p_brother_id, v_new_token, 'active');

  RETURN v_new_token;
END;
$$;

-- Revogar acesso público e conceder apenas execução
REVOKE EXECUTE ON FUNCTION public.generate_digital_card(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_digital_card(uuid, uuid) TO authenticated;

-- 6. RPC para Revogação Simples
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
  ELSIF private.is_store_admin(p_store_id) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Acesso negado para revogar carteirinha.';
  END IF;

  -- Revoga
  UPDATE public.digital_cards 
  SET status = 'revoked', revoked_at = pg_catalog.now() 
  WHERE brother_id = p_brother_id AND store_id = p_store_id AND status = 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_digital_card(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_digital_card(uuid, uuid) TO authenticated;

-- 7. RPC para Validação Pública (Segura)
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
    dc.status, 
    b.full_name, 
    s.name as store_name
  INTO v_card
  FROM public.digital_cards dc
  JOIN public.brothers b ON b.id = dc.brother_id
  JOIN public.stores s ON s.id = dc.store_id
  WHERE dc.token = p_token;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Se revogada, retornar apenas status para não vazar dados
  IF v_card.status = 'revoked' THEN
    RETURN pg_catalog.json_build_object('status', 'revoked');
  END IF;

  -- Obter nome abreviado (Ex: Fernando Luiz Braidotti -> Fernando B.)
  v_parts := pg_catalog.string_to_array(v_card.full_name, ' ');
  IF pg_catalog.array_length(v_parts, 1) > 1 THEN
    v_short_name := v_parts[1] || ' ' || pg_catalog.substring(v_parts[pg_catalog.array_length(v_parts, 1)] from 1 for 1) || '.';
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

-- Não conceder PUBLIC ou ANON. Essa função deve ser chamada apenas pelo servidor via Service Role Key
-- para podermos auditar IP e fazer rate limit no servidor web (Next.js)
REVOKE EXECUTE ON FUNCTION public.validate_digital_card(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_digital_card(text) TO authenticated;
-- Nota: Service Role herda bypass de RLS e grant de autenticado/banco, então não precisa GRANT explícito.

