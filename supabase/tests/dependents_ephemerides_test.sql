-- Teste de Validação Transacional: Phase 14 Part 2 (Dependentes, Privacidade e RLS)
BEGIN;

-- Alternar papel da sessão para 'authenticated' para testar com RLS ativo
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_salto_id uuid := '1e257586-80f6-49a0-aa6e-234acfdbbdda';
  v_paula_id uuid := '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  v_brother_salto_id uuid;
  v_admin_salto_id uuid := '1216b143-5d7d-4054-875a-1f0c851c8f71'; -- lsm@maconaria360.com.br
  v_member_salto_id uuid := '9c45182b-6fa7-4589-92c1-3a325cc9870d'; -- luizmarcelo@maconaria360.com.br
  v_dep_id uuid;
  v_admin_dep_year int;
  v_member_dep_year int;
  v_member_dep_name text;
BEGIN
  -- Definir contexto JWT como Admin de Salto
  EXECUTE format('SET LOCAL request.jwt.claims = ''{"sub": "%s", "role": "authenticated"}''', v_admin_salto_id);

  -- Buscar um irmão de Salto Moutonnee
  SELECT id INTO v_brother_salto_id FROM public.brothers WHERE store_id = v_salto_id LIMIT 1;

  RAISE NOTICE 'Iniciando testes para Salto ID: %, Paula ID: %', v_salto_id, v_paula_id;

  -- TESTE 1: Inserção de dependente por Admin da Loja
  INSERT INTO public.dependents (brother_id, store_id, name, relationship, birthdate)
  VALUES (v_brother_salto_id, v_salto_id, 'Maria Eduarda Fernandes', 'Esposa', '1988-05-20')
  RETURNING id INTO v_dep_id;

  IF v_dep_id IS NULL THEN
    RAISE EXCEPTION 'TESTE FALHOU: Admin da loja não conseguiu inserir dependente.';
  ELSE
    RAISE NOTICE 'TESTE 1 PASSOU: Admin inseriu dependente ID %', v_dep_id;
  END IF;

  -- TESTE 2: Executar get_upcoming_ephemerides como Admin da Loja (Deve retornar Nome Completo e Ano de Nascimento)
  SELECT year, brother_name INTO v_admin_dep_year, v_member_dep_name
  FROM public.get_upcoming_ephemerides(v_salto_id, 365)
  WHERE item_type = 'dependent_birthday' AND item_id = v_dep_id;

  IF v_admin_dep_year IS NULL OR v_admin_dep_year != 1988 OR v_member_dep_name NOT LIKE 'Maria Eduarda%' THEN
    RAISE EXCEPTION 'TESTE FALHOU: Admin não recebeu o nome completo ou ano de nascimento do dependente. Recebido ano: %, nome: %', v_admin_dep_year, v_member_dep_name;
  ELSE
    RAISE NOTICE 'TESTE 2 PASSOU: Admin visualiza nome completo (%), ano (%)', v_member_dep_name, v_admin_dep_year;
  END IF;

  -- TESTE 3: Executar get_upcoming_ephemerides como Membro Comum (Deve retornar Apenas Primeiro Nome e Ano NULL)
  EXECUTE format('SET LOCAL request.jwt.claims = ''{"sub": "%s", "role": "authenticated"}''', v_member_salto_id);

  SELECT year, brother_name INTO v_member_dep_year, v_member_dep_name
  FROM public.get_upcoming_ephemerides(v_salto_id, 365)
  WHERE item_type = 'dependent_birthday' AND item_id = v_dep_id;

  IF v_member_dep_year IS NOT NULL OR v_member_dep_name LIKE 'Maria Eduarda%' THEN
    RAISE EXCEPTION 'TESTE FALHOU: Membro comum visualizou dados confidenciais! Ano: %, Nome: %', v_member_dep_year, v_member_dep_name;
  ELSE
    RAISE NOTICE 'TESTE 3 PASSOU: Membro comum visualiza apenas primeiro nome e ano nulo (Nome: %, Ano: %)', v_member_dep_name, v_member_dep_year;
  END IF;

  -- TESTE 4: Membro comum tenta inserir dependente (Deve ser bloqueado por RLS)
  BEGIN
    INSERT INTO public.dependents (brother_id, store_id, name, relationship, birthdate)
    VALUES (v_brother_salto_id, v_salto_id, 'Dependente Ilegal', 'Filho(a)', '2015-01-01');
    RAISE EXCEPTION 'TESTE FALHOU: Membro comum conseguiu inserir dependente!';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'TESTE 4 PASSOU: RLS bloqueou inserção de dependente por membro comum.';
  END;

  -- TESTE 5: Tentativa de Acesso Cruzado - Membro de Salto tentando ler dependentes de Paula Sousa
  BEGIN
    PERFORM public.get_upcoming_ephemerides(v_paula_id, 30);
    RAISE EXCEPTION 'TESTE FALHOU: Membro de Salto conseguiu consultar RPC de Paula Sousa!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TESTE 5 PASSOU: Acesso cruzado a Paula Sousa foi bloqueado corretamente (%).', SQLERRM;
  END;

END $$;

ROLLBACK;
