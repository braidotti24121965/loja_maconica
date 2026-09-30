-- Migration: Melhorias de Segurança em Convites (Phase 3.2)

-- 1. Adicionar email para vincular convite ao destinatário
ALTER TABLE public.store_invites ADD COLUMN email TEXT;

-- 2. Atualizar a função accept_invite para validar e-mail e manter segurança
CREATE OR REPLACE FUNCTION public.accept_invite(invite_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_invite public.store_invites%rowtype;
  v_uid uuid;
  v_email text;
BEGIN
  -- Obter usuário atual de forma segura (auth.uid() and auth.jwt()->>'email')
  v_uid := (select auth.uid());
  v_email := (select auth.jwt() ->> 'email');
  
  if v_uid is null then
    return false;
  end if;

  -- Buscar convite válido (ainda não usado e não expirado)
  select * into v_invite 
  from public.store_invites 
  where token = invite_token 
    and used_at is null 
    and expires_at > now();
    
  if not found then
    return false;
  end if;

  -- Validação estrita: se o convite tiver email, deve bater com o email da sessão
  if v_invite.email is not null and lower(trim(v_invite.email)) != lower(trim(v_email)) then
    return false;
  end if;

  -- Criar vínculo com a loja (usando a role exata do convite - evita manipulação)
  insert into public.store_memberships (store_id, user_id, role)
  values (v_invite.store_id, v_uid, v_invite.role)
  on conflict (store_id, user_id) do update set role = v_invite.role;

  -- Marcar o convite como usado, evitando reuso ou corrida
  update public.store_invites 
  set used_at = now() 
  where id = v_invite.id;

  return true;
END;
$$;

-- Permitir que admins apaguem (revoguem) convites
CREATE POLICY store_invites_delete ON public.store_invites
  FOR DELETE TO authenticated
  USING (private.is_store_admin(store_id));


REVOKE ALL ON FUNCTION public.accept_invite(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;

