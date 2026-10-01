-- Fase 14: Módulo de Efemérides, Aniversários e Datas Maçônicas

-- 1. Novas colunas na tabela brothers (datas pessoais e maçônicas)
ALTER TABLE public.brothers
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS initiation_date date,
  ADD COLUMN IF NOT EXISTS elevation_date date,
  ADD COLUMN IF NOT EXISTS exaltation_date date;

-- 2. Tabela de Efemérides (Gerais do SaaS e Locais da Loja)
CREATE TABLE IF NOT EXISTS public.ephemerides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE, -- NULL = Efeméride Geral do SaaS
  title text NOT NULL,
  description text,
  day integer NOT NULL CHECK (day BETWEEN 1 AND 31),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer, -- NULL se for evento recorrente anual
  category text NOT NULL CHECK (category IN ('masonic_history', 'store_anniversary', 'commemorative', 'other')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ephemerides_store_id ON public.ephemerides(store_id);
CREATE INDEX IF NOT EXISTS idx_ephemerides_month_day ON public.ephemerides(month, day);

ALTER TABLE public.ephemerides ENABLE ROW LEVEL SECURITY;

-- Permissões de Leitura: Geral do SaaS (store_id IS NULL) ou Membro da Loja (store_id)
CREATE POLICY ephemerides_select ON public.ephemerides
  FOR SELECT TO authenticated
  USING (
    store_id IS NULL OR private.is_store_member(store_id)
  );

-- Permissões de Inserção: SaaS Admin se store_id IS NULL, ou Store Admin se store_id IS NOT NULL
CREATE POLICY ephemerides_insert ON public.ephemerides
  FOR INSERT TO authenticated
  WITH CHECK (
    (store_id IS NULL AND public.is_platform_admin()) OR
    (store_id IS NOT NULL AND private.is_store_admin(store_id))
  );

CREATE POLICY ephemerides_update ON public.ephemerides
  FOR UPDATE TO authenticated
  USING (
    (store_id IS NULL AND public.is_platform_admin()) OR
    (store_id IS NOT NULL AND private.is_store_admin(store_id))
  )
  WITH CHECK (
    (store_id IS NULL AND public.is_platform_admin()) OR
    (store_id IS NOT NULL AND private.is_store_admin(store_id))
  );

CREATE POLICY ephemerides_delete ON public.ephemerides
  FOR DELETE TO authenticated
  USING (
    (store_id IS NULL AND public.is_platform_admin()) OR
    (store_id IS NOT NULL AND private.is_store_admin(store_id))
  );

-- Grant/Revoke
REVOKE ALL ON TABLE public.ephemerides FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ephemerides TO authenticated;


-- 3. Função RPC para buscar próximas efemérides e aniversários consolidados
CREATE OR REPLACE FUNCTION public.get_upcoming_ephemerides(
  p_store_id uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS TABLE (
  item_type text,         -- 'birthday', 'initiation', 'elevation', 'exaltation', 'ephemeris'
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
BEGIN
  -- Verificar se o usuário pertence à loja
  IF (SELECT auth.uid()) IS NULL OR NOT private.is_store_member(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING errcode = '42501';
  END IF;

  RETURN QUERY
  -- 1. Aniversariantes Natalícios da Loja (Retorna apenas dia e mês)
  SELECT 
    'birthday'::text AS item_type,
    b.id AS item_id,
    'Aniversário de ' || b.full_name AS title,
    'Aniversário natalício do Ir. ' || b.full_name AS description,
    extract(day from b.birthdate)::integer AS day,
    extract(month from b.birthdate)::integer AS month,
    NULL::integer AS year, -- Oculta ano para membros comuns
    b.degree AS degree,
    b.full_name AS brother_name,
    'birthday'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.birthdate IS NOT NULL

  UNION ALL

  -- 2. Aniversários de Iniciação
  SELECT 
    'initiation'::text AS item_type,
    b.id AS item_id,
    'Iniciação de ' || b.full_name AS title,
    'Aniversário de Iniciação do Ir. ' || b.full_name AS description,
    extract(day from b.initiation_date)::integer AS day,
    extract(month from b.initiation_date)::integer AS month,
    extract(year from b.initiation_date)::integer AS year,
    b.degree AS degree,
    b.full_name AS brother_name,
    'masonic'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.initiation_date IS NOT NULL

  UNION ALL

  -- 3. Aniversários de Elevação
  SELECT 
    'elevation'::text AS item_type,
    b.id AS item_id,
    'Elevação de ' || b.full_name AS title,
    'Aniversário de Elevação do Ir. ' || b.full_name AS description,
    extract(day from b.elevation_date)::integer AS day,
    extract(month from b.elevation_date)::integer AS month,
    extract(year from b.elevation_date)::integer AS year,
    b.degree AS degree,
    b.full_name AS brother_name,
    'masonic'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.elevation_date IS NOT NULL

  UNION ALL

  -- 4. Aniversários de Exaltação
  SELECT 
    'exaltation'::text AS item_type,
    b.id AS item_id,
    'Exaltação de ' || b.full_name AS title,
    'Aniversário de Exaltação do Ir. ' || b.full_name AS description,
    extract(day from b.exaltation_date)::integer AS day,
    extract(month from b.exaltation_date)::integer AS month,
    extract(year from b.exaltation_date)::integer AS year,
    b.degree AS degree,
    b.full_name AS brother_name,
    'masonic'::text AS category,
    false AS is_global
  FROM public.brothers b
  WHERE b.store_id = p_store_id
    AND b.exaltation_date IS NOT NULL

  UNION ALL

  -- 5. Efemérides Cadastradas (Gerais do SaaS + Locais da Loja)
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
