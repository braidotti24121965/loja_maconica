-- Fase 11 - Correção: Arquitetura Segura de Janelas de Check-in

-- 1. Revogar e dropar a função insegura anterior (caso tenha sido aplicada)
REVOKE ALL ON FUNCTION public.register_store_checkin(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.register_store_checkin(uuid);

-- 2. Tabela de Janelas de Check-in
CREATE TABLE IF NOT EXISTS public.session_checkin_windows (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL,
  session_id uuid NOT NULL UNIQUE, -- Apenas uma janela por sessão
  challenge_code text NOT NULL UNIQUE, -- Código rotativo/aleatório
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  closed_at timestamptz,
  opened_by uuid NOT NULL REFERENCES auth.users(id),
  
  CONSTRAINT fk_window_store FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_window_session FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_checkin_windows_challenge ON public.session_checkin_windows(challenge_code) WHERE status = 'open';
ALTER TABLE public.session_checkin_windows ENABLE ROW LEVEL SECURITY;

-- Apenas admins/secretários podem gerenciar janelas, membros podem ler as ativas se souberem a loja
CREATE POLICY checkin_windows_select ON public.session_checkin_windows
  FOR SELECT TO authenticated
  USING (private.is_store_member(store_id));

-- 3. Atualizar tabela de presenças para auditoria avançada
ALTER TABLE public.session_attendances
ADD COLUMN IF NOT EXISTS checkin_window_id uuid REFERENCES public.session_checkin_windows(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'qr', 'code')),
ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- 4. Função: Abrir Janela de Check-in
CREATE OR REPLACE FUNCTION public.open_checkin_window(p_session_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store_id uuid;
  v_challenge text;
BEGIN
  -- Validar se a sessão existe e o usuário é admin/secretário
  SELECT store_id INTO v_store_id FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sessão não encontrada.'; END IF;
  
  IF NOT private.is_store_admin(v_store_id) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem abrir janelas de check-in.';
  END IF;

  -- Gerar código curto de 6 caracteres (ex: A8F2B1)
  v_challenge := pg_catalog.upper(pg_catalog.substring(pg_catalog.encode(extensions.gen_random_bytes(16), 'hex'), 1, 6));

  -- Fechar janelas abertas anteriores desta mesma loja para evitar conflito
  UPDATE public.session_checkin_windows
  SET status = 'closed', closed_at = pg_catalog.now()
  WHERE store_id = v_store_id AND status = 'open';

  -- Criar nova janela (Usa ON CONFLICT para caso já exista registro para esta sessão)
  INSERT INTO public.session_checkin_windows (store_id, session_id, challenge_code, status, opened_at, opened_by)
  VALUES (v_store_id, p_session_id, v_challenge, 'open', pg_catalog.now(), auth.uid())
  ON CONFLICT (session_id) DO UPDATE 
  SET status = 'open', challenge_code = EXCLUDED.challenge_code, opened_at = pg_catalog.now(), closed_at = NULL, opened_by = EXCLUDED.opened_by;

  RETURN v_challenge;
END;
$$;
REVOKE ALL ON FUNCTION public.open_checkin_window(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_checkin_window(uuid) TO authenticated;


-- 5. Função: Fechar Janela de Check-in
CREATE OR REPLACE FUNCTION public.close_checkin_window(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT store_id INTO v_store_id FROM public.sessions WHERE id = p_session_id;
  IF NOT private.is_store_admin(v_store_id) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE public.session_checkin_windows
  SET status = 'closed', closed_at = pg_catalog.now()
  WHERE session_id = p_session_id;
END;
$$;
REVOKE ALL ON FUNCTION public.close_checkin_window(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_checkin_window(uuid) TO authenticated;


-- 6. Função Segura: Registrar Presença via Challenge
CREATE OR REPLACE FUNCTION public.register_presence_by_challenge(p_challenge text, p_method text)
RETURNS pg_catalog.json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window record;
  v_brother_id uuid;
  v_time_sp timestamp;
BEGIN
  -- Definir timezone SP explicitly
  v_time_sp := pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now());

  -- 1. Buscar Janela Ativa
  SELECT id, store_id, session_id, status 
  INTO v_window
  FROM public.session_checkin_windows
  WHERE challenge_code = p_challenge AND status = 'open';

  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Código inválido, expirado ou janela de check-in fechada.');
  END IF;

  -- 2. Validar Membro (Deve pertencer à Loja da Janela e estar ativo/vinculado)
  SELECT id INTO v_brother_id
  FROM public.brothers
  WHERE store_id = v_window.store_id AND user_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Você não é um obreiro vinculado a esta loja.');
  END IF;

  -- 3. Inserir Presença com Proteção de Concorrência (ON CONFLICT)
  BEGIN
    INSERT INTO public.session_attendances (
      session_id, store_id, brother_id, status, checkin_window_id, method, registered_by, created_at
    )
    VALUES (
      v_window.session_id, v_window.store_id, v_brother_id, 'present', v_window.id, p_method, auth.uid(), v_time_sp
    )
    ON CONFLICT (session_id, brother_id) DO UPDATE 
    SET 
      status = 'present', 
      checkin_window_id = EXCLUDED.checkin_window_id,
      method = EXCLUDED.method,
      updated_by = auth.uid(),
      updated_at = v_time_sp;
      
  EXCEPTION WHEN OTHERS THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Erro ao registrar presença: ' || SQLERRM);
  END;

  RETURN pg_catalog.json_build_object('success', true, 'message', 'Presença confirmada com sucesso!');
END;
$$;
REVOKE ALL ON FUNCTION public.register_presence_by_challenge(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_presence_by_challenge(text, text) TO authenticated;
