-- Migração: Permitir que membros gerenciem (inserir, atualizar, excluir) seus próprios dependentes em dependents

DROP POLICY IF EXISTS dependents_insert ON public.dependents;
DROP POLICY IF EXISTS dependents_update ON public.dependents;
DROP POLICY IF EXISTS dependents_delete ON public.dependents;

-- Inserção: Administradores/Secretários OU o próprio Irmão responsável
CREATE POLICY dependents_insert ON public.dependents
  FOR INSERT TO authenticated
  WITH CHECK (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND (private.is_store_admin(b.store_id) OR b.user_id = (SELECT auth.uid()))
    )
  );

-- Atualização: Administradores/Secretários OU o próprio Irmão responsável
CREATE POLICY dependents_update ON public.dependents
  FOR UPDATE TO authenticated
  USING (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND (private.is_store_admin(b.store_id) OR b.user_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND (private.is_store_admin(b.store_id) OR b.user_id = (SELECT auth.uid()))
    )
  );

-- Exclusão: Administradores/Secretários OU o próprio Irmão responsável
CREATE POLICY dependents_delete ON public.dependents
  FOR DELETE TO authenticated
  USING (
    (store_id IS NOT NULL AND private.is_store_admin(store_id)) OR
    EXISTS (
      SELECT 1 FROM public.brothers b
      WHERE b.id = dependents.brother_id
        AND (private.is_store_admin(b.store_id) OR b.user_id = (SELECT auth.uid()))
    )
  );
