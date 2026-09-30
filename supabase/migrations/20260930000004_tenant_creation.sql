-- Função segura para criação de Tenant e atribuição de dono (Owner) no onboarding
CREATE OR REPLACE FUNCTION public.create_tenant(new_name text, new_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  -- Insert tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (new_name, new_slug)
  RETURNING id INTO new_tenant_id;

  -- Assign creator as owner
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (new_tenant_id, (SELECT auth.uid()), 'owner');

  RETURN new_tenant_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_tenant(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_tenant(text, text) TO authenticated;
