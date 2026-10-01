-- Migração: Auto-vinculação automática de Ficha de Obreiro (public.brothers) e RPC get_or_link_my_brother

-- 1. Sincronizar retroativamente brothers não vinculados com auth.users baseados em store_memberships
UPDATE public.brothers b
SET user_id = sm.user_id,
    email = COALESCE(NULLIF(TRIM(b.email), ''), u.email)
FROM public.store_memberships sm
JOIN auth.users u ON u.id = sm.user_id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE b.store_id = sm.store_id
  AND b.user_id IS NULL
  AND (
    (b.email IS NOT NULL AND LOWER(TRIM(b.email)) = LOWER(TRIM(u.email)))
    OR (p.full_name IS NOT NULL AND LOWER(TRIM(b.full_name)) = LOWER(TRIM(p.full_name)))
  );

-- 2. Garantir que todo membro com store_membership possua uma ficha de obreiro em public.brothers
INSERT INTO public.brothers (store_id, user_id, full_name, email, degree, created_by, created_at)
SELECT 
  sm.store_id,
  sm.user_id,
  COALESCE(p.full_name, u.email, 'Membro da Loja'),
  u.email,
  'Mestre Maçom',
  sm.user_id,
  NOW()
FROM public.store_memberships sm
JOIN auth.users u ON u.id = sm.user_id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.brothers b 
  WHERE b.store_id = sm.store_id AND b.user_id = sm.user_id
);

-- 3. Criar a RPC public.get_or_link_my_brother para busca e autovinculação instantânea
CREATE OR REPLACE FUNCTION public.get_or_link_my_brother(p_store_id uuid)
RETURNS SETOF public.brothers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_user_email text;
  v_profile_name text;
  v_brother_id uuid;
BEGIN
  IF v_user_id IS NULL OR p_store_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Buscar brother já vinculado pelo user_id
  SELECT id INTO v_brother_id
  FROM public.brothers
  WHERE store_id = p_store_id AND user_id = v_user_id
  LIMIT 1;

  IF v_brother_id IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM public.brothers WHERE id = v_brother_id;
    RETURN;
  END IF;

  -- Buscar dados do usuário logado
  SELECT u.email INTO v_user_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  SELECT p.full_name INTO v_profile_name
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- 2. Tentar vincular por e-mail se houver ficha não vinculada
  IF v_user_email IS NOT NULL AND TRIM(v_user_email) <> '' THEN
    SELECT id INTO v_brother_id
    FROM public.brothers
    WHERE store_id = p_store_id
      AND user_id IS NULL
      AND LOWER(TRIM(email)) = LOWER(TRIM(v_user_email))
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- 3. Tentar vincular por nome completo se não achou por e-mail
  IF v_brother_id IS NULL AND v_profile_name IS NOT NULL AND TRIM(v_profile_name) <> '' THEN
    SELECT id INTO v_brother_id
    FROM public.brothers
    WHERE store_id = p_store_id
      AND user_id IS NULL
      AND LOWER(TRIM(full_name)) = LOWER(TRIM(v_profile_name))
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- 4. Se encontrou uma ficha elegível, vincula agora
  IF v_brother_id IS NOT NULL THEN
    UPDATE public.brothers
    SET user_id = v_user_id,
        email = COALESCE(NULLIF(TRIM(email), ''), v_user_email)
    WHERE id = v_brother_id;

    RETURN QUERY
    SELECT * FROM public.brothers WHERE id = v_brother_id;
    RETURN;
  END IF;

  -- 5. Se o usuário tem vinculo em store_memberships mas não tem brother, cria a ficha automaticamente
  IF EXISTS (
    SELECT 1 FROM public.store_memberships
    WHERE store_id = p_store_id AND user_id = v_user_id
  ) THEN
    INSERT INTO public.brothers (
      store_id,
      user_id,
      full_name,
      email,
      degree,
      created_by,
      created_at
    ) VALUES (
      p_store_id,
      v_user_id,
      COALESCE(v_profile_name, v_user_email, 'Membro da Loja'),
      v_user_email,
      'Mestre Maçom',
      v_user_id,
      NOW()
    )
    RETURNING id INTO v_brother_id;

    RETURN QUERY
    SELECT * FROM public.brothers WHERE id = v_brother_id;
    RETURN;
  END IF;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_link_my_brother(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_or_link_my_brother(uuid) TO authenticated;
