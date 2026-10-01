-- Fase 13: Correção do Accept Invite para Isolamento de Tenant

CREATE OR REPLACE FUNCTION public.accept_invite(invite_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.store_invites%rowtype;
  v_uid uuid := (select auth.uid());
  v_email text := lower(trim(coalesce((select auth.jwt() ->> 'email'), '')));
  v_tenant_id uuid;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  SELECT * INTO v_invite
  FROM public.store_invites
  WHERE token = invite_token
  FOR UPDATE;

  IF NOT FOUND
    OR v_invite.email IS NULL
    OR v_invite.used_at IS NOT NULL
    OR v_invite.revoked_at IS NOT NULL
    OR v_invite.expires_at <= now()
    OR v_invite.email <> v_email THEN
    RETURN false;
  END IF;

  -- Obter o tenant_id da loja do convite
  SELECT tenant_id INTO v_tenant_id
  FROM public.stores
  WHERE id = v_invite.store_id;

  -- Insere o usuário como 'member' no tenant (se já não estiver lá)
  -- Para que o usuário possa acessar a loja via RLS (is_tenant_member)
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_uid, 'member')
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  -- Insere o usuário na store_memberships
  INSERT INTO public.store_memberships (store_id, user_id, role)
  VALUES (v_invite.store_id, v_uid, v_invite.role)
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = excluded.role;

  -- Marca o convite como aceito
  UPDATE public.store_invites
  SET used_at = now(), accepted_by = v_uid
  WHERE id = v_invite.id;

  RETURN true;
END;
$$;
