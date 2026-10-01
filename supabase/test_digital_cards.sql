-- TESTES SQL REAIS DA CARTEIRINHA DIGITAL (A serem executados no SQL Editor)

-- Iniciar transação de teste
BEGIN;

-- Criar variáveis de mock
DO $$
DECLARE
  v_store_id uuid := pg_catalog.gen_random_uuid();
  v_user_id uuid := pg_catalog.gen_random_uuid();
  v_brother_id uuid := pg_catalog.gen_random_uuid();
  v_token1 text;
  v_token2 text;
  v_resultado json;
BEGIN
  -- 1. Setup inicial mockando loja e membro
  INSERT INTO auth.users (id, email) VALUES (v_user_id, 'teste@maconaria.com');
  INSERT INTO public.stores (id, name, slug) VALUES (v_store_id, 'Loja Teste Segurança', 'loja-seguranca');
  INSERT INTO public.brothers (id, store_id, user_id, full_name, cim, degree) 
  VALUES (v_brother_id, v_store_id, v_user_id, 'João Carlos Silva', '123456', 'Mestre');

  -- MOCK DO USUÁRIO LOGADO (Para testar RLS)
  EXECUTE 'set local role authenticated';
  EXECUTE 'set local request.jwt.claim.sub = ''' || v_user_id || '''';

  -- TESTE 1: Membro gera apenas a própria (Com sucesso)
  v_token1 := public.generate_digital_card(v_store_id, v_brother_id);
  ASSERT v_token1 IS NOT NULL, 'Falha ao gerar primeira carteirinha';
  
  -- TESTE 2: Garantir constraint (apenas 1 ativa) na concorrência gerando segunda
  v_token2 := public.generate_digital_card(v_store_id, v_brother_id);
  ASSERT v_token1 != v_token2, 'Token não foi renovado';

  -- TESTE 3: Verificar constraint de revogada
  ASSERT (SELECT count(*) FROM public.digital_cards WHERE brother_id = v_brother_id AND status = 'active') = 1, 'Múltiplas carteiras ativas detectadas';
  ASSERT (SELECT count(*) FROM public.digital_cards WHERE brother_id = v_brother_id AND status = 'revoked') = 1, 'Carteira antiga não foi revogada';
  ASSERT (SELECT revoked_at FROM public.digital_cards WHERE token = v_token1) IS NOT NULL, 'Revoked_at não foi preenchido na revogação';

  -- TESTE 4: Membro grava diretamente INSERT/UPDATE? (Deve falhar no RLS)
  BEGIN
    INSERT INTO public.digital_cards (store_id, brother_id, token, status) VALUES (v_store_id, v_brother_id, 'hack-token', 'active');
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: INSERT direto não foi bloqueado pela política!';
  EXCEPTION WHEN insufficient_privilege THEN
    -- Sucesso: foi bloqueado
  END;

  -- TESTE 5: Revogação pura funciona
  PERFORM public.revoke_digital_card(v_store_id, v_brother_id);
  ASSERT (SELECT count(*) FROM public.digital_cards WHERE brother_id = v_brother_id AND status = 'active') = 0, 'Revogação falhou';

  -- MOCK ADMIN (Tentando ler tokens de outros)
  EXECUTE 'set local role authenticated';
  EXECUTE 'set local request.jwt.claim.sub = ''' || pg_catalog.gen_random_uuid() || ''''; -- UUID de outro cara
  ASSERT (SELECT count(*) FROM public.digital_cards) = 0, 'Falha: Outro usuário leu os cartões!';

  -- MOCK ANON (Tentando usar a função de validação sem Service Role)
  EXECUTE 'set local role anon';
  BEGIN
    PERFORM public.validate_digital_card(v_token2);
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Função de validação permitiu acesso ANON!';
  EXCEPTION WHEN insufficient_privilege THEN
    -- Sucesso: foi bloqueado
  END;

  -- MOCK SERVICE ROLE (Simulando API NextJS)
  EXECUTE 'set local role service_role';
  v_resultado := public.validate_digital_card(v_token2);
  ASSERT v_resultado->>'status' = 'revoked', 'Falha: Resposta da validação não omitiu dados na revogação!';
  ASSERT v_resultado->>'full_name' IS NULL, 'Falha: Nome completo vazou em cartão revogado!';

  RAISE NOTICE '===== TODOS OS 10 TESTES PASSARAM COM SUCESSO! =====';
END $$;

ROLLBACK;
