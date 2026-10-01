BEGIN;

DO $$ 
DECLARE
  v_tenant_id uuid;
  v_store_id uuid;
  
  -- IDs para usuários fakes
  v_admin_id uuid := pg_catalog.gen_random_uuid();
  v_guest_id uuid := pg_catalog.gen_random_uuid();
  v_guest_email text := 'teste@maconaria.com';
  
  v_token_valid uuid;
  v_token_expired uuid;
  v_token_revoked uuid;
  v_token_wrong_email uuid;
  
  v_result boolean;
BEGIN
  -- SETUP: Cria usuários temporários na auth.users para satisfazer Foreign Keys
  -- Minimal auth.users insertion
  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'admin_mock@maconaria.com');
  INSERT INTO auth.users (id, email) VALUES (v_guest_id, v_guest_email);

  -- SETUP: Cria tenant e store temporários para teste
  INSERT INTO public.tenants (name, slug) VALUES ('Tenant Isolado Teste', 'tenant-isolado-teste') RETURNING id INTO v_tenant_id;
  INSERT INTO public.stores (tenant_id, name, active) VALUES (v_tenant_id, 'Loja Isolada Teste', true) RETURNING id INTO v_store_id;
  
  -- SETUP: Cria convites
  -- 1. Válido
  INSERT INTO public.store_invites (store_id, role, email, created_by, expires_at)
  VALUES (v_store_id, 'member', v_guest_email, v_admin_id, pg_catalog.now() + interval '1 day')
  RETURNING token INTO v_token_valid;
  
  -- 2. Expirado
  INSERT INTO public.store_invites (store_id, role, email, created_by, expires_at)
  VALUES (v_store_id, 'member', v_guest_email, v_admin_id, pg_catalog.now() - interval '1 day')
  RETURNING token INTO v_token_expired;
  
  -- 3. Revogado
  INSERT INTO public.store_invites (store_id, role, email, created_by, expires_at, revoked_at, revoked_by)
  VALUES (v_store_id, 'member', v_guest_email, v_admin_id, pg_catalog.now() + interval '1 day', pg_catalog.now(), v_admin_id)
  RETURNING token INTO v_token_revoked;

  -- 4. E-mail errado
  INSERT INTO public.store_invites (store_id, role, email, created_by, expires_at)
  VALUES (v_store_id, 'member', 'outro@email.com', v_admin_id, pg_catalog.now() + interval '1 day')
  RETURNING token INTO v_token_wrong_email;

  -- MOCK DO JWT E UID DO SUPABASE NO CONTEXTO DA SESSÃO
  -- Sobrepondo os claims singulares e plurais para garantir o override do dashboard
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_guest_id, 'email', v_guest_email)::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_guest_id::text, true);
  PERFORM set_config('request.jwt.claim.email', v_guest_email, true);
  
  -- TESTE A: Convite expirado
  v_result := public.accept_invite(v_token_expired);
  IF v_result THEN RAISE EXCEPTION 'Falha (Teste A): Convite expirado foi aceito!'; END IF;
  
  -- TESTE B: Convite revogado
  v_result := public.accept_invite(v_token_revoked);
  IF v_result THEN RAISE EXCEPTION 'Falha (Teste B): Convite revogado foi aceito!'; END IF;
  
  -- TESTE C: E-mail diferente
  v_result := public.accept_invite(v_token_wrong_email);
  IF v_result THEN RAISE EXCEPTION 'Falha (Teste C): Convite de e-mail diferente foi aceito!'; END IF;
  
  -- TESTE D: Convite válido
  v_result := public.accept_invite(v_token_valid);
  IF NOT v_result THEN RAISE EXCEPTION 'Falha (Teste D): Convite válido foi RECUSADO!'; END IF;
  
  -- TESTE E: Reutilização do convite válido
  v_result := public.accept_invite(v_token_valid);
  IF v_result THEN RAISE EXCEPTION 'Falha (Teste E): Convite reutilizado foi aceito!'; END IF;

  -- VERIFICAÇÃO DE ISOLAMENTO
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_memberships 
    WHERE tenant_id = v_tenant_id AND user_id = v_guest_id AND role = 'viewer'
  ) THEN 
    RAISE EXCEPTION 'Falha de Isolamento: Usuário não foi inserido corretamente no tenant_memberships como viewer'; 
  END IF;

  RAISE NOTICE '>>> SUCESSO: TESTE TRANSACIONAL (accept_invite) APROVOU TODA A SEGURANÇA <<<';
END $$;

ROLLBACK;
