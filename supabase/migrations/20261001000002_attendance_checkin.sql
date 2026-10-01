-- Fase 11: Frequência por QR Code e Check-in Inteligente

-- Criação da função de Check-in Inteligente
CREATE OR REPLACE FUNCTION public.register_store_checkin(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_brother_id uuid;
  v_session_id uuid;
  v_existing boolean;
BEGIN
  -- 1. Descobrir se o usuário logado é um irmão ativo desta loja
  SELECT id INTO v_brother_id
  FROM public.brothers
  WHERE store_id = p_store_id AND user_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Você não é um membro vinculado a esta loja ou não está autenticado.');
  END IF;

  -- 2. Procurar uma sessão ocorrendo HOJE nesta loja (Ignora horários, pega pelo dia)
  SELECT id INTO v_session_id
  FROM public.sessions
  WHERE store_id = p_store_id 
    AND date = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Nenhuma sessão agendada para a data de hoje nesta loja.');
  END IF;

  -- 3. Verificar se já não assinou presença
  SELECT true INTO v_existing
  FROM public.session_attendances
  WHERE session_id = v_session_id AND brother_id = v_brother_id;

  IF v_existing THEN
    RETURN pg_catalog.json_build_object('success', true, 'message', 'Sua presença já estava registrada para a sessão de hoje!');
  END IF;

  -- 4. Inserir a presença
  INSERT INTO public.session_attendances (session_id, store_id, brother_id, status)
  VALUES (v_session_id, p_store_id, v_brother_id, 'present');

  RETURN pg_catalog.json_build_object('success', true, 'message', 'Check-in realizado com sucesso! Excelente Sessão.');
END;
$$;

-- Somente usuários autenticados podem chamar essa função
REVOKE ALL ON FUNCTION public.register_store_checkin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_store_checkin(uuid) TO authenticated;
