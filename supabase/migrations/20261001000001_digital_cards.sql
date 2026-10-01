-- Garantir vínculo seguro de loja no FK
ALTER TABLE public.brothers ADD CONSTRAINT brothers_store_id_id_key UNIQUE (store_id, id);

-- Tabela para carteirinhas digitais seguras
CREATE TABLE public.digital_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  brother_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT fk_digital_cards_brother FOREIGN KEY (store_id, brother_id) REFERENCES public.brothers(store_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_revoked_at CHECK (status = 'active' OR (status = 'revoked' AND revoked_at IS NOT NULL))
);

-- Permitir no máximo uma carteirinha ativa por membro
CREATE UNIQUE INDEX idx_one_active_card ON public.digital_cards(brother_id) WHERE status = 'active';

CREATE INDEX idx_digital_cards_store_id ON public.digital_cards(store_id);

ALTER TABLE public.digital_cards ENABLE ROW LEVEL SECURITY;

-- Membros e administradores podem LER (Ninguém pode inserir/atualizar diretamente, apenas via RPC)
CREATE POLICY digital_cards_select ON public.digital_cards
  FOR SELECT TO authenticated
  USING (
    private.is_store_admin(store_id) OR
    brother_id IN (SELECT id FROM public.brothers WHERE user_id = auth.uid() AND store_id = public.digital_cards.store_id)
  );

-- RPC para geração/revogação de carteirinha
CREATE OR REPLACE FUNCTION public.revoke_and_generate_card(
  p_store_id uuid,
  p_brother_id uuid,
  p_token text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_authorized boolean := false;
BEGIN
  -- Validar permissão (É o próprio membro ou admin)
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
  SET status = 'revoked', revoked_at = now() 
  WHERE brother_id = p_brother_id AND store_id = p_store_id AND status = 'active';

  -- Insere a nova
  INSERT INTO public.digital_cards (store_id, brother_id, token, status)
  VALUES (p_store_id, p_brother_id, p_token, 'active');
END;
$$;

-- Revogar acesso público e conceder apenas execução
REVOKE EXECUTE ON FUNCTION public.revoke_and_generate_card(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_and_generate_card(uuid, uuid, text) TO authenticated;

-- RPC para Validação Pública (Anonimo)
CREATE OR REPLACE FUNCTION public.validate_digital_card(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card record;
  v_result json;
BEGIN
  SELECT 
    dc.status, 
    b.full_name, 
    b.cim, 
    b.degree, 
    s.name as store_name
  INTO v_card
  FROM public.digital_cards dc
  JOIN public.brothers b ON b.id = dc.brother_id
  JOIN public.stores s ON s.id = dc.store_id
  WHERE dc.token = p_token;

  IF NOT FOUND THEN
    -- Resposta genérica
    RETURN NULL;
  END IF;

  -- Retorna apenas os dados mínimos e mascara o CIM
  v_result := json_build_object(
    'status', v_card.status,
    'full_name', v_card.full_name,
    'store_name', v_card.store_name,
    'degree', v_card.degree,
    'cim_masked', CASE WHEN v_card.cim IS NOT NULL AND length(v_card.cim) >= 3 THEN substring(v_card.cim from 1 for 3) || '***' ELSE 'N/A' END
  );

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_digital_card(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_digital_card(text) TO anon, authenticated;
