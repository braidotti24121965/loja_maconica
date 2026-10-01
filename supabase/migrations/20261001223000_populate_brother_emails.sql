-- Migração: Popular emails existentes em public.brothers e sincronizar autovinculação

-- 1. Atualizar emails dos irmãos que já possuem vínculo com usuários do Supabase Auth
UPDATE public.brothers b
SET email = u.email
FROM auth.users u
WHERE b.user_id = u.id
  AND (b.email IS NULL OR TRIM(b.email) = '');

-- 2. Tentar correlacionar por nome em perfis existentes
UPDATE public.brothers b
SET email = u.email
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE (b.email IS NULL OR TRIM(b.email) = '')
  AND LOWER(TRIM(b.full_name)) = LOWER(TRIM(p.full_name));

-- 3. Função de gatilho para manter brothers.email em sintonia quando user_id for associado
CREATE OR REPLACE FUNCTION public.sync_brother_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (NEW.email IS NULL OR TRIM(NEW.email) = '') THEN
    SELECT u.email INTO NEW.email
    FROM auth.users u
    WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_brother_email_from_auth ON public.brothers;
CREATE TRIGGER trg_sync_brother_email_from_auth
  BEFORE INSERT OR UPDATE ON public.brothers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_brother_email_from_auth();

-- 4. Atualizar a RPC link_own_user_to_brother para garantir o preenchimento de email no vinculo
CREATE OR REPLACE FUNCTION public.link_own_user_to_brother(p_store_id uuid, p_brother_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_user_email text;
  v_updated integer;
BEGIN
  IF v_user_id IS NULL OR p_store_id IS NULL OR p_brother_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.store_memberships
    WHERE store_id = p_store_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Não é membro desta loja' USING errcode = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.brothers
    WHERE store_id = p_store_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Usuário já vinculado nesta loja' USING errcode = '23505';
  END IF;

  SELECT u.email INTO v_user_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  UPDATE public.brothers
  SET user_id = v_user_id,
      email = COALESCE(email, v_user_email)
  WHERE id = p_brother_id
    AND store_id = p_store_id
    AND user_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.link_own_user_to_brother(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.link_own_user_to_brother(uuid, uuid) TO authenticated;
