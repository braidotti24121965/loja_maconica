-- Fase 14 (Parte 2): Migração de Dependentes, Permissões RLS e Privacidade de Efemérides

-- 1. Adicionar coluna store_id em dependents (se ainda não existir)
ALTER TABLE public.dependents
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

-- 2. Popular store_id em dependents existentes com base em brothers.store_id
UPDATE public.dependents d
SET store_id = b.store_id
FROM public.brothers b
WHERE d.brother_id = b.id AND d.store_id IS NULL;

-- 3. Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_dependents_store_id ON public.dependents(store_id);
CREATE INDEX IF NOT EXISTS idx_dependents_brother_id ON public.dependents(brother_id);
CREATE INDEX IF NOT EXISTS idx_dependents_birthdate ON public.dependents(birthdate);

-- 4. Atualizar RLS de public.dependents
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros podem ver dependentes" ON public.dependents;
DROP POLICY IF EXISTS "Membros podem inserir dependentes" ON public.dependents;
DROP POLICY IF EXISTS "Membros podem atualizar dependentes" ON public.dependents;
DROP POLICY IF EXISTS "Membros podem deletar dependentes" ON public.dependents;
DROP POLICY IF EXISTS "Membros podem ver dependentes de sua loja" ON public.dependents;
DROP POLICY IF EXISTS "Membros podem gerenciar dependentes de sua loja" ON public.dependents;
DROP POLICY IF EXISTS dependents_select ON public.dependents;
DROP POLICY IF EXISTS dependents_insert ON public.dependents;
DROP POLICY IF EXISTS dependents_update ON public.dependents;
DROP POLICY IF EXISTS dependents_delete ON public.dependents;

-- Leitura: Qualquer membro da loja pode ver dependentes da mesma loja
CREATE POLICY dependents_select ON public.dependents
  FOR SELECT TO authenticated
  USING (
    (store_id IS NOT NULL AND private.is_store_member(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND private.is_store_member(b.store_id)
    )
  );

-- Inserção: Apenas Administradores e Secretários da Loja
CREATE POLICY dependents_insert ON public.dependents
  FOR INSERT TO authenticated
  WITH CHECK (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND private.is_store_admin(b.store_id)
    )
  );

-- Atualização: Apenas Administradores e Secretários da Loja
CREATE POLICY dependents_update ON public.dependents
  FOR UPDATE TO authenticated
  USING (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND private.is_store_admin(b.store_id)
    )
  )
  WITH CHECK (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND private.is_store_admin(b.store_id)
    )
  );

-- Exclusão: Apenas Administradores e Secretários da Loja
CREATE POLICY dependents_delete ON public.dependents
  FOR DELETE TO authenticated
  USING (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND private.is_store_admin(b.store_id)
    )
  );

REVOKE ALL ON TABLE public.dependents FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dependents TO authenticated;


-- 5. Atualizar RPC public.get_upcoming_ephemerides para incluir dependentes com privacidade
CREATE OR REPLACE FUNCTION public.get_upcoming_ephemerides(
  p_store_id uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS TABLE (
  item_type text,         -- 'birthday', 'dependent_birthday', 'initiation', 'elevation', 'exaltation', 'ephemeris'
  item_id uuid,
  title text,
  description text,
  day integer,
  month integer,
  year integer,
  degree text,
  brother_name text,
  category text,
  is_global boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Verificar se o usuário pertence à loja
  IF (SELECT auth.uid()) IS NULL OR NOT private.is_store_member(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING errcode = '42501';
  END IF;

  v_is_admin := private.is_store_admin(p_store_id);

  RETURN QUERY
  -- 1. Aniversariantes Natalícios dos Irmãos
  SELECT 
    'birthday'::text AS item_type,
    b.id AS item_id,
    'Aniversário de ' || b.full_name AS title,
    'Aniversário natalício do Ir. ' || b.full_name AS description,
    pg_catalog.date_part('day', b.birthdate)::integer AS day,
    pg_catalog.date_part('month', b.birthdate)::integer AS month,
    CASE 
      WHEN v_is_admin THEN pg_catalog.date_part('year', b.birthdate)::integer
      ELSE NULL::integer
    END AS year,
    b.degree AS degree,
    b.full_name AS brother_name,
    'birthday'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.birthdate IS NOT NULL

  UNION ALL

  -- 2. Aniversariantes Natalícios dos Dependentes (Privacidade aplicada)
  SELECT 
    'dependent_birthday'::text AS item_type,
    d.id AS item_id,
    CASE 
      WHEN v_is_admin THEN 'Aniversário de ' || d.name || ' (' || d.relationship || ' do Ir. ' || b.full_name || ')'
      ELSE 'Aniversário de ' || pg_catalog.split_part(d.name, ' ', 1) || ' (' || d.relationship || ' do Ir. ' || b.full_name || ')'
    END AS title,
    CASE 
      WHEN v_is_admin THEN 'Aniversário natalício de ' || d.name || ' (' || d.relationship || ' do Ir. ' || b.full_name || ')'
      ELSE 'Aniversário natalício de ' || pg_catalog.split_part(d.name, ' ', 1) || ' (' || d.relationship || ' do Ir. ' || b.full_name || ')'
    END AS description,
    pg_catalog.date_part('day', d.birthdate)::integer AS day,
    pg_catalog.date_part('month', d.birthdate)::integer AS month,
    CASE 
      WHEN v_is_admin THEN pg_catalog.date_part('year', d.birthdate)::integer
      ELSE NULL::integer
    END AS year,
    NULL::text AS degree,
    CASE 
      WHEN v_is_admin THEN d.name || ' (' || d.relationship || ' do Ir. ' || b.full_name || ')'
      ELSE pg_catalog.split_part(d.name, ' ', 1) || ' (' || d.relationship || ' do Ir. ' || b.full_name || ')'
    END AS brother_name,
    'dependent_birthday'::text AS category,
    false AS is_global
  FROM public.dependents d
  JOIN public.brothers b ON b.id = d.brother_id
  WHERE (d.store_id = p_store_id OR (d.store_id IS NULL AND b.store_id = p_store_id))
    AND d.birthdate IS NOT NULL

  UNION ALL

  -- 3. Aniversários de Iniciação
  SELECT 
    'initiation'::text AS item_type,
    b.id AS item_id,
    'Iniciação de ' || b.full_name AS title,
    'Aniversário de Iniciação do Ir. ' || b.full_name AS description,
    pg_catalog.date_part('day', b.initiation_date)::integer AS day,
    pg_catalog.date_part('month', b.initiation_date)::integer AS month,
    pg_catalog.date_part('year', b.initiation_date)::integer AS year,
    b.degree AS degree,
    b.full_name AS brother_name,
    'masonic'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.initiation_date IS NOT NULL

  UNION ALL

  -- 4. Aniversários de Elevação
  SELECT 
    'elevation'::text AS item_type,
    b.id AS item_id,
    'Elevação de ' || b.full_name AS title,
    'Aniversário de Elevação do Ir. ' || b.full_name AS description,
    pg_catalog.date_part('day', b.elevation_date)::integer AS day,
    pg_catalog.date_part('month', b.elevation_date)::integer AS month,
    pg_catalog.date_part('year', b.elevation_date)::integer AS year,
    b.degree AS degree,
    b.full_name AS brother_name,
    'masonic'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.elevation_date IS NOT NULL

  UNION ALL

  -- 5. Aniversários de Exaltação
  SELECT 
    'exaltation'::text AS item_type,
    b.id AS item_id,
    'Exaltação de ' || b.full_name AS title,
    'Aniversário de Exaltação do Ir. ' || b.full_name AS description,
    pg_catalog.date_part('day', b.exaltation_date)::integer AS day,
    pg_catalog.date_part('month', b.exaltation_date)::integer AS month,
    pg_catalog.date_part('year', b.exaltation_date)::integer AS year,
    b.degree AS degree,
    b.full_name AS brother_name,
    'masonic'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.exaltation_date IS NOT NULL

  UNION ALL

  -- 6. Efemérides Cadastradas (Gerais do SaaS + Locais da Loja)
  SELECT 
    'ephemeris'::text AS item_type,
    e.id AS item_id,
    e.title AS title,
    e.description AS description,
    e.day AS day,
    e.month AS month,
    e.year AS year,
    NULL::text AS degree,
    NULL::text AS brother_name,
    e.category AS category,
    (e.store_id IS NULL) AS is_global
  FROM public.ephemerides e
  WHERE (e.store_id IS NULL OR e.store_id = p_store_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_upcoming_ephemerides(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_upcoming_ephemerides(uuid, integer) TO authenticated;
