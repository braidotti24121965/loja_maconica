-- Fase 13: Arquitetura de Acessos e SaaS Owner (Corrigida)

-- 1. Tabela de Donos da Plataforma
CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_admins_select ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Não permitir que usuários comuns alterem platform_admins
-- Apenas superusuários do banco (postgres) podem inserir aqui.

-- 2. Tabela Interna de Auditoria
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    platform_admin_id uuid NOT NULL REFERENCES public.platform_admins(user_id) ON DELETE CASCADE,
    action text NOT NULL,
    target_table text,
    target_id uuid,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_audit_logs_select ON public.platform_audit_logs FOR SELECT TO authenticated USING (platform_admin_id = auth.uid());
CREATE POLICY platform_audit_logs_insert ON public.platform_audit_logs FOR INSERT TO authenticated WITH CHECK (platform_admin_id = auth.uid());

-- 3. Função Pública e Segura de Verificação Global
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT exists (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 4. Função Segura para Agregação de Dados do Dashboard (Evita RLS amplo nas tabelas de PII)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_tenants int;
  v_stores int;
  v_brothers int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(*) INTO v_tenants FROM public.tenants;
  SELECT count(*) INTO v_stores FROM public.stores;
  SELECT count(*) INTO v_brothers FROM public.brothers;

  RETURN json_build_object(
    'tenants', v_tenants,
    'stores', v_stores,
    'brothers', v_brothers
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;

-- 5. Função Segura para Listar Lojas Agregadas
CREATE OR REPLACE FUNCTION public.get_platform_stores()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_agg(json_build_object(
    'id', s.id,
    'name', s.name,
    'tenant_name', t.name,
    'created_at', s.created_at
  )) INTO v_result
  FROM public.stores s
  JOIN public.tenants t ON s.tenant_id = t.id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
REVOKE ALL ON FUNCTION public.get_platform_stores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_stores() TO authenticated;

-- 6. Função Protegida de Log
CREATE OR REPLACE FUNCTION public.log_platform_action(p_action text, p_table text DEFAULT NULL, p_target_id uuid DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.platform_audit_logs (platform_admin_id, action, target_table, target_id, details)
  VALUES (auth.uid(), p_action, p_table, p_target_id, p_details);
END;
$$;
REVOKE ALL ON FUNCTION public.log_platform_action(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_platform_action(text, text, uuid, jsonb) TO authenticated;

-- (O RLS excessivo foi removido. O platform admin usará RPCs específicas para acessar agregados)
