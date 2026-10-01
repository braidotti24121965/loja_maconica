-- Fase 11: Correções Finais de Segurança e RLS para o Check-in

-- 1. Limpar funções antigas e vulneráveis (Idempotente)
REVOKE ALL ON FUNCTION public.open_checkin_window(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.open_checkin_window(uuid);

REVOKE ALL ON FUNCTION public.close_checkin_window(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.close_checkin_window(uuid);

REVOKE ALL ON FUNCTION public.register_presence_by_challenge(text, text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.register_presence_by_challenge(text, text);

-- 2. Garantir Chave Composta em Sessions
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_store_id_id_key;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_store_id_id_key UNIQUE (store_id, id);

-- 3. Atualizar Tabela de Janelas (session_checkin_windows)
ALTER TABLE public.session_checkin_windows ADD COLUMN IF NOT EXISTS qr_token text UNIQUE;
ALTER TABLE public.session_checkin_windows ADD COLUMN IF NOT EXISTS short_code text;
ALTER TABLE public.session_checkin_windows ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill para dados antigos, se existirem
UPDATE public.session_checkin_windows 
SET expires_at = opened_at + interval '4 hours', 
    qr_token = pg_catalog.gen_random_uuid()::text, 
    short_code = COALESCE(challenge_code, '000000') 
WHERE expires_at IS NULL;

ALTER TABLE public.session_checkin_windows ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE public.session_checkin_windows ALTER COLUMN qr_token SET NOT NULL;
ALTER TABLE public.session_checkin_windows ALTER COLUMN short_code SET NOT NULL;

-- Dropar código antigo inseguro
ALTER TABLE public.session_checkin_windows DROP CONSTRAINT IF EXISTS session_checkin_windows_challenge_code_key;
ALTER TABLE public.session_checkin_windows DROP COLUMN IF EXISTS challenge_code;

-- Ajustar chaves estrangeiras
ALTER TABLE public.session_checkin_windows DROP CONSTRAINT IF EXISTS fk_window_session;
ALTER TABLE public.session_checkin_windows DROP CONSTRAINT IF EXISTS fk_window_session_composite;
ALTER TABLE public.session_checkin_windows ADD CONSTRAINT fk_window_session_composite FOREIGN KEY (store_id, session_id) REFERENCES public.sessions(store_id, id) ON DELETE CASCADE;

ALTER TABLE public.session_checkin_windows DROP CONSTRAINT IF EXISTS chk_window_dates;
ALTER TABLE public.session_checkin_windows ADD CONSTRAINT chk_window_dates CHECK (expires_at > opened_at AND (closed_at IS NULL OR closed_at >= opened_at));

-- Índice Parcial Único: Uma janela ativa por LOJA (não apenas por sessão)
DROP INDEX IF EXISTS public.idx_one_open_window_per_store;
CREATE UNIQUE INDEX idx_one_open_window_per_store ON public.session_checkin_windows(store_id) WHERE status = 'open' AND expires_at > pg_catalog.now();

-- 4. Restringir RLS (Apenas admin lê a janela)
DROP POLICY IF EXISTS checkin_windows_select ON public.session_checkin_windows;
CREATE POLICY checkin_windows_select ON public.session_checkin_windows
  FOR SELECT TO authenticated
  USING (private.is_store_admin(store_id));

-- 5. Rate Limiting Table para Códigos Curtos
CREATE TABLE IF NOT EXISTS public.checkin_rate_limits (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 1,
  locked_until timestamptz,
  created_at timestamptz DEFAULT pg_catalog.now(),
  updated_at timestamptz DEFAULT pg_catalog.now(),
  UNIQUE(user_id, store_id)
);
ALTER TABLE public.checkin_rate_limits ENABLE ROW LEVEL SECURITY;

-- 6. Função: Abrir Janela
CREATE OR REPLACE FUNCTION public.open_checkin_window(p_session_id uuid, p_duration_hours int DEFAULT 4)
RETURNS pg_catalog.json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store_id uuid;
  v_qr_token text;
  v_short_code text;
  v_expires_at timestamptz;
BEGIN
  SELECT store_id INTO v_store_id FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN pg_catalog.json_build_object('success', false, 'message', 'Sessão não encontrada.'); END IF;
  
  IF NOT private.is_store_admin(v_store_id) THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Acesso negado.');
  END IF;

  v_qr_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
  v_short_code := pg_catalog.upper(pg_catalog.substring(pg_catalog.encode(extensions.gen_random_bytes(16), 'hex'), 1, 6));
  v_expires_at := pg_catalog.now() + (p_duration_hours || ' hours')::interval;

  -- Fechar janelas expiradas ou abertas da mesma loja
  UPDATE public.session_checkin_windows
  SET status = 'closed', closed_at = pg_catalog.now()
  WHERE store_id = v_store_id AND status = 'open';

  INSERT INTO public.session_checkin_windows (store_id, session_id, qr_token, short_code, status, opened_at, expires_at, opened_by)
  VALUES (v_store_id, p_session_id, v_qr_token, v_short_code, 'open', pg_catalog.now(), v_expires_at, auth.uid())
  ON CONFLICT (session_id) DO UPDATE 
  SET status = 'open', qr_token = EXCLUDED.qr_token, short_code = EXCLUDED.short_code, opened_at = pg_catalog.now(), expires_at = EXCLUDED.expires_at, closed_at = NULL, opened_by = EXCLUDED.opened_by;

  RETURN pg_catalog.json_build_object('success', true, 'qr_token', v_qr_token, 'short_code', v_short_code, 'expires_at', v_expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.open_checkin_window(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_checkin_window(uuid, int) TO authenticated;

-- 7. Função: Fechar Janela
CREATE OR REPLACE FUNCTION public.close_checkin_window(p_session_id uuid)
RETURNS pg_catalog.json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT store_id INTO v_store_id FROM public.sessions WHERE id = p_session_id;
  IF NOT private.is_store_admin(v_store_id) THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Acesso negado.');
  END IF;

  UPDATE public.session_checkin_windows
  SET status = 'closed', closed_at = pg_catalog.now()
  WHERE session_id = p_session_id AND status = 'open';

  RETURN pg_catalog.json_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.close_checkin_window(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_checkin_window(uuid) TO authenticated;

-- 8. Função Core: Processar Presença (Usada internamente pelas duas rotas)
CREATE OR REPLACE FUNCTION private.process_presence(p_window_id uuid, p_method text)
RETURNS pg_catalog.json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window record;
  v_brother_id uuid;
  v_existing record;
BEGIN
  SELECT * INTO v_window FROM public.session_checkin_windows WHERE id = p_window_id;

  IF v_window.status != 'open' OR v_window.expires_at <= pg_catalog.now() THEN
    -- Auto-close se expirou e tentaram usar
    IF v_window.status = 'open' THEN
      UPDATE public.session_checkin_windows SET status = 'closed', closed_at = pg_catalog.now() WHERE id = p_window_id;
    END IF;
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Janela de check-in expirada ou fechada.');
  END IF;

  SELECT id INTO v_brother_id FROM public.brothers WHERE store_id = v_window.store_id AND user_id = auth.uid() AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Obreiro não encontrado ou inativo nesta loja.');
  END IF;

  SELECT * INTO v_existing FROM public.session_attendances WHERE session_id = v_window.session_id AND brother_id = v_brother_id;
  
  IF FOUND THEN
    IF v_existing.status = 'justified' THEN
      RETURN pg_catalog.json_build_object('success', false, 'message', 'Sua falta já está justificada.');
    END IF;
    IF v_existing.status = 'present' THEN
      RETURN pg_catalog.json_build_object('success', true, 'message', 'Presença já confirmada anteriormente.');
    END IF;
  END IF;

  INSERT INTO public.session_attendances (session_id, store_id, brother_id, status, checkin_window_id, method, registered_by, created_at, updated_at)
  VALUES (v_window.session_id, v_window.store_id, v_brother_id, 'present', v_window.id, p_method, auth.uid(), pg_catalog.now(), pg_catalog.now())
  ON CONFLICT (session_id, brother_id) DO UPDATE 
  SET status = 'present', checkin_window_id = EXCLUDED.checkin_window_id, method = EXCLUDED.method, updated_by = EXCLUDED.registered_by, updated_at = pg_catalog.now()
  WHERE public.session_attendances.status != 'justified';

  RETURN pg_catalog.json_build_object('success', true, 'message', 'Presença confirmada.');
END;
$$;

-- 9. Função Segura: QR Code
CREATE OR REPLACE FUNCTION public.register_presence_qr(p_qr_token text)
RETURNS pg_catalog.json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_id uuid;
BEGIN
  SELECT id INTO v_window_id FROM public.session_checkin_windows WHERE qr_token = p_qr_token AND status = 'open';
  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'QR Code inválido ou expirado.');
  END IF;
  RETURN private.process_presence(v_window_id, 'qr');
END;
$$;
REVOKE ALL ON FUNCTION public.register_presence_qr(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_presence_qr(text) TO authenticated;

-- 10. Função Segura: Short Code (Com Rate Limit)
CREATE OR REPLACE FUNCTION public.register_presence_short(p_short_code text)
RETURNS pg_catalog.json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_id uuid;
  v_store_id uuid;
  v_rate_limit record;
BEGIN
  -- Rate limiting básico global por usuário, protegendo enumeração
  SELECT * INTO v_rate_limit FROM public.checkin_rate_limits WHERE user_id = auth.uid() ORDER BY updated_at DESC LIMIT 1;
  IF FOUND AND v_rate_limit.locked_until > pg_catalog.now() THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Muitas tentativas. Aguarde 5 minutos.');
  END IF;

  SELECT id, store_id INTO v_window_id, v_store_id FROM public.session_checkin_windows WHERE short_code = p_short_code AND status = 'open' AND expires_at > pg_catalog.now();
  
  IF NOT FOUND THEN
    INSERT INTO public.checkin_rate_limits (user_id, store_id, attempts, updated_at)
    VALUES (auth.uid(), pg_catalog.gen_random_uuid(), 1, pg_catalog.now())
    ON CONFLICT (user_id, store_id) DO UPDATE SET attempts = public.checkin_rate_limits.attempts + 1, updated_at = pg_catalog.now(), locked_until = CASE WHEN public.checkin_rate_limits.attempts >= 4 THEN pg_catalog.now() + interval '5 minutes' ELSE NULL END;
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Código incorreto.');
  END IF;

  -- Reset rate limit on success
  DELETE FROM public.checkin_rate_limits WHERE user_id = auth.uid();
  
  RETURN private.process_presence(v_window_id, 'code');
END;
$$;
REVOKE ALL ON FUNCTION public.register_presence_short(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_presence_short(text) TO authenticated;
