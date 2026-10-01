import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Apenas proteja rotas sob /lojas/[id]/...
  const match = pathname.match(/^\/lojas\/([a-f0-9-]+)\/(.*)$/);
  if (!match) return NextResponse.next();
  
  const storeId = match[1];
  const subroute = match[2];

  // Defina as rotas administrativas
  const adminRoutes = [
    'financeiro',
    'configuracoes',
    'comunicacao',
    'convidar',
    'sessoes',
    'eventos'
  ];
  const strictAdminRoutes = [
    'sessoes/nova',
    'eventos/novo',
    'membros/novo'
  ];
  
  const isEditing = subroute.endsWith('/editar');
  
  const requiresAdmin = adminRoutes.some(route => subroute === route || subroute.startsWith(route + '/')) ||
                        strictAdminRoutes.some(route => subroute === route || subroute.startsWith(route + '/')) ||
                        subroute === 'membros' || 
                        isEditing; 

  if (!requiresAdmin) {
    return NextResponse.next();
  }

  // Verifica permissão no Supabase
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { data: membership } = await supabase
    .from('store_memberships')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.redirect(new URL('/lojas', request.url));
  }

  const role = membership.role;
  const isTreasurer = ['admin', 'treasurer'].includes(role);
  const isAdmin = ['admin', 'secretary'].includes(role);

  // Regras Específicas
  if (subroute.startsWith('financeiro') && !isTreasurer) {
    return NextResponse.redirect(new URL(`/lojas/${storeId}/meu-espaco`, request.url));
  }
  if (!subroute.startsWith('financeiro') && !isAdmin) {
    return NextResponse.redirect(new URL(`/lojas/${storeId}/meu-espaco`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/lojas/:id/:path*'
  ],
}
