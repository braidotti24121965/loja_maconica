-- Fase 13: Correção do Accept Invite para Isolamento de Tenant (Definitivo)

CREATE OR REPLACE FUNCTION public.accept_invite(invite_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.store_invites%rowtype;
  v_uid uuid := (SELECT auth.uid());
  v_email text := lower(trim(coalesce((SELECT auth.jwt() ->> 'email'), '')));
  v_tenant_id uuid;
BEGIN
  -- 1. Usuário autenticado obrigatório
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  -- 2. Busca o convite com bloqueio transacional FOR UPDATE
  SELECT * INTO v_invite
  FROM public.store_invites
  WHERE token = invite_token
  FOR UPDATE;

  -- 3. Validações estritas
  IF NOT FOUND
    OR v_invite.email IS NULL
    OR v_invite.used_at IS NOT NULL
    OR v_invite.revoked_at IS NOT NULL
    OR v_invite.expires_at <= pg_catalog.now()
    OR lower(trim(v_invite.email)) <> v_email THEN
    RETURN false;
  END IF;

  -- 4. Valida se a loja existe e descobre seu tenant
  SELECT tenant_id INTO v_tenant_id
  FROM public.stores
  WHERE id = v_invite.store_id;

  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  -- Valida se o tenant existe de fato
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant_id) THEN
    RETURN false;
  END IF;

  -- 5. Insere o usuário como 'viewer' no tenant (se já não estiver lá)
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_uid, 'viewer'::public.tenant_role)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  -- 6. Insere o usuário na loja
  INSERT INTO public.store_memberships (store_id, user_id, role)
  VALUES (v_invite.store_id, v_uid, v_invite.role)
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = excluded.role;

  -- 7. Marca o convite como aceito
  UPDATE public.store_invites
  SET used_at = pg_catalog.now(), accepted_by = v_uid
  WHERE id = v_invite.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;
