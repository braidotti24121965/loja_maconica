-- Fase 13: Arquitetura de Acessos e SaaS Owner

-- 1. Tabela de Donos da Plataforma
CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_admins_select ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

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

-- 3. Função Auxiliar de Verificação Global
CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT exists (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION private.is_platform_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated;

-- 4. Injetar Acesso Global (Somente Leitura) para platform_admin nas tabelas principais
CREATE POLICY tenants_select_platform_admin ON public.tenants FOR SELECT TO authenticated USING (private.is_platform_admin());
CREATE POLICY stores_select_platform_admin ON public.stores FOR SELECT TO authenticated USING (private.is_platform_admin());
CREATE POLICY tenant_memberships_select_platform_admin ON public.tenant_memberships FOR SELECT TO authenticated USING (private.is_platform_admin());
CREATE POLICY store_memberships_select_platform_admin ON public.store_memberships FOR SELECT TO authenticated USING (private.is_platform_admin());
CREATE POLICY brothers_select_platform_admin ON public.brothers FOR SELECT TO authenticated USING (private.is_platform_admin());
CREATE POLICY monthly_dues_select_platform_admin ON public.monthly_dues FOR SELECT TO authenticated USING (private.is_platform_admin());

-- 5. Função Protegida de Log
CREATE OR REPLACE FUNCTION public.log_platform_action(p_action text, p_table text DEFAULT NULL, p_target_id uuid DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.platform_audit_logs (platform_admin_id, action, target_table, target_id, details)
  VALUES (auth.uid(), p_action, p_table, p_target_id, p_details);
END;
$$;
REVOKE ALL ON FUNCTION public.log_platform_action(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_platform_action(text, text, uuid, jsonb) TO authenticated;
