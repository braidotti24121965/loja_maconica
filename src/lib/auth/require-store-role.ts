import "server-only"

import { createClient } from "@/lib/supabase/server"

export type StoreRole = 'admin' | 'secretary' | 'treasurer' | 'member' | 'viewer'

export interface StoreGuardResult {
  userId: string
  role: StoreRole
}

/**
 * Verifica autenticação e papel admin na loja.
 * Papéis aceitos: 'admin', 'secretary'.
 * Lança Error('Não autorizado') em qualquer falha — não vaza motivo específico.
 */
export async function requireStoreAdmin(storeId: string): Promise<StoreGuardResult> {
  if (!storeId) throw new Error('Não autorizado')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')

  const { data: membership } = await supabase
    .from('store_memberships')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single()

  const role = membership?.role as StoreRole | undefined
  if (!role || !['admin', 'secretary'].includes(role)) {
    throw new Error('Não autorizado')
  }

  return { userId: user.id, role }
}

/**
 * Verifica autenticação e papel de tesoureiro na loja.
 * Papéis aceitos: 'admin', 'treasurer'.
 * Lança Error('Não autorizado') em qualquer falha — não vaza motivo específico.
 */
export async function requireStoreTreasurer(storeId: string): Promise<StoreGuardResult> {
  if (!storeId) throw new Error('Não autorizado')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')

  const { data: membership } = await supabase
    .from('store_memberships')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single()

  const role = membership?.role as StoreRole | undefined
  if (!role || !['admin', 'treasurer'].includes(role)) {
    throw new Error('Não autorizado')
  }

  return { userId: user.id, role }
}
