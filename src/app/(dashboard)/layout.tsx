import { Building2, LayoutDashboard, Store, Users, User } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "../actions";
import Link from "next/link";

import { getActiveStore } from "@/lib/context";
import { StoreSwitcher } from "@/components/StoreSwitcher";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let email = "ambiente local";
  let profileName = "Usuário";
  let userStores: { id: string, name: string }[] = [];
  let activeStoreId = await getActiveStore();
  
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    
    if (data.user) {
      email = data.user.email ?? "usuário";
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .single();
        
      if (!profile) {
        redirect("/onboarding");
      } else {
        profileName = profile.full_name;
      }
      
      // Fetch user's stores
      const { data: memberships } = await supabase
        .from("store_memberships")
        .select("store_id, stores(name)")
        .eq("user_id", data.user.id);
        
      if (memberships) {
        userStores = memberships.map(m => ({
          id: m.store_id,
          name: (m.stores as any)?.name || "Loja Desconhecida"
        }));
      }
      
      // If activeStoreId is not valid, reset it
      if (activeStoreId && !userStores.find(s => s.id === activeStoreId)) {
        activeStoreId = null;
      }
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">CL</div><div className="brand-copy"><strong>Controle de Lojas</strong><small>Administração</small></div></div>
        <nav className="nav" aria-label="Navegação principal">
          <Link href="/"><LayoutDashboard size={18}/><span>Visão geral</span></Link>
          <Link href="/lojas"><Store size={18}/><span>Minhas Lojas</span></Link>
          <Link href="/perfil"><User size={18}/><span>Meu Perfil</span></Link>
        </nav>
        <StoreSwitcher stores={userStores} activeId={activeStoreId} />
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
             {/* Simple dynamic header could be added later, we'll keep it simple for now */}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar" title={email}>{profileName.slice(0, 2).toUpperCase()}</div>
            {hasSupabaseEnv() && <form action={logout}><button className="button" style={{ minHeight: 38 }}>Sair</button></form>}
          </div>
        </header>
        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
}
