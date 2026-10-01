import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'

// Rotas que exigem papel admin ou secretary na loja
// Membros podem LER sessoes e eventos — protege somente mutações
const ADMIN_SUBROUTES = [
  'comunicacao',
  'convidar',
  'membros',
  'configuracoes',
]
const TREASURER_SUBROUTES = ['financeiro']
// Subrotas exatas de mutação (criação, edição, frequência, upload de ata)
const ADMIN_EXACT = [
  'membros/novo',
  'sessoes/nova',
  'eventos/novo',
]
const ADMIN_SUBROUTE_PATTERNS = [
  /^sessoes\/[^/]+\/frequencia(\/.*)?$/,  // frequência administrativa
  /^eventos\/[^/]+\/editar$/,             // edição de evento
]

function log(
  level: 'warn' | 'error',
  stage: string,
  errorType: string,
  pathname: string,
) {
  // Jamais registrar cookies, tokens, chaves ou conteúdo do JWT
  console[level](
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      stage,
      errorType,
      pathname,
    }),
  )
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Só protege /lojas/[uuid]/subroute
  const match = pathname.match(/^\/lojas\/([a-f0-9-]{36})\/(.+)$/)
  if (!match) return NextResponse.next()

  const storeId = match[1]
  const subroute = match[2]
  const isEditing = subroute.endsWith('/editar')

  const needsAdmin =
    ADMIN_SUBROUTES.some(r => subroute === r || subroute.startsWith(r + '/')) ||
    ADMIN_EXACT.some(r => subroute === r) ||
    ADMIN_SUBROUTE_PATTERNS.some(p => p.test(subroute)) ||
    isEditing

  const needsTreasurer =
    TREASURER_SUBROUTES.some(
      r => subroute === r || subroute.startsWith(r + '/'),
    )

  if (!needsAdmin && !needsTreasurer) return NextResponse.next()

  // ── Estágio 1: Variáveis de ambiente ──────────────────────────────────────
  let envUrl: string
  let envKey: string
  try {
    const env = getSupabaseEnv()
    envUrl = env.url
    envKey = env.publishableKey
  } catch {
    log('error', 'env', 'missing_env_vars', pathname)
    // Env ausente: sem autenticação possível, redireciona para login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Estágio 2: Cliente Supabase ───────────────────────────────────────────
  let proxyResponse = NextResponse.next({ request })

  const supabase = createServerClient(envUrl, envKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        proxyResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          proxyResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // ── Estágio 3: Autenticação ───────────────────────────────────────────────
  let userId: string
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Sessão expirada ou token inválido: redireciona para login
      log('warn', 'auth', error.name ?? 'auth_error', pathname)
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!data.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    userId = data.user.id
  } catch (err) {
    // Falha de infraestrutura (Supabase inacessível, timeout, etc.)
    const errorType = err instanceof Error ? err.name : 'unknown_error'
    log('error', 'auth', errorType, pathname)
    return new Response('Serviço temporariamente indisponível.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // ── Estágio 4: Vínculo na loja ────────────────────────────────────────────
  let role: string | null = null
  try {
    const { data: membership, error } = await supabase
      .from('store_memberships')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Sem vínculo nesta loja: redireciona para listagem
        return NextResponse.redirect(new URL('/lojas', request.url))
      }
      // Erro de BD inesperado
      log('error', 'authorization', error.code ?? 'db_error', pathname)
      return new Response('Serviço temporariamente indisponível.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    role = membership?.role ?? null
  } catch (err) {
    const errorType = err instanceof Error ? err.name : 'unknown_error'
    log('error', 'authorization', errorType, pathname)
    return new Response('Serviço temporariamente indisponível.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (!role) {
    return NextResponse.redirect(new URL('/lojas', request.url))
  }

  // ── Estágio 5: Verificação de papel ──────────────────────────────────────
  const isTreasurer = ['admin', 'treasurer'].includes(role)
  const isAdmin = ['admin', 'secretary'].includes(role)

  if (needsTreasurer && !isTreasurer) {
    return NextResponse.redirect(
      new URL(`/lojas/${storeId}/meu-espaco`, request.url),
    )
  }
  if (needsAdmin && !isAdmin) {
    return NextResponse.redirect(
      new URL(`/lojas/${storeId}/meu-espaco`, request.url),
    )
  }

  return proxyResponse
}

export const config = {
  matcher: ['/lojas/:id/:path*'],
}
