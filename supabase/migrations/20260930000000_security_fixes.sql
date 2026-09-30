-- Fix 1: update_updated_at_column com search_path fixo
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix 2: Refatorar as políticas de dependents (separar operações e usar (select auth.uid()))
DROP POLICY IF EXISTS "Membros podem ver dependentes de sua loja" ON public.dependents;
DROP POLICY IF EXISTS "Membros podem gerenciar dependentes de sua loja" ON public.dependents;

CREATE POLICY "Membros podem ver dependentes"
  ON public.dependents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Membros podem inserir dependentes"
  ON public.dependents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Membros podem atualizar dependentes"
  ON public.dependents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Membros podem deletar dependentes"
  ON public.dependents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.brothers b
      JOIN public.store_memberships sm ON sm.store_id = b.store_id
      WHERE b.id = dependents.brother_id
      AND sm.user_id = (select auth.uid())
    )
  );

-- Fix 3: Garantir search_path vazio ou restrito na accept_invite, e verificar auth.uid() nulo
CREATE OR REPLACE FUNCTION public.accept_invite(invite_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_invite public.store_invites%rowtype;
  v_uid uuid;
BEGIN
  -- Obter usuário atual de forma segura
  v_uid := (select auth.uid());
  
  if v_uid is null then
    return false;
  end if;

  -- Buscar convite válido
  select * into v_invite 
  from public.store_invites 
  where token = invite_token 
    and used_at is null 
    and expires_at > now();
    
  if not found then
    return false;
  end if;

  -- Criar vínculo
  insert into public.store_memberships (store_id, user_id, role)
  values (v_invite.store_id, v_uid, v_invite.role)
  on conflict (store_id, user_id) do update set role = v_invite.role;

  -- Marcar como usado
  update public.store_invites 
  set used_at = now() 
  where id = v_invite.id;

  return true;
END;
$$;
