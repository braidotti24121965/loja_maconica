import { LayoutDashboard, Store, User } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "../actions";
import Link from "next/link";

import { getActiveStore } from "@/lib/context";
import { StoreSwitcher } from "@/components/StoreSwitcher";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  secretary: "Secretário",
  treasurer: "Tesoureiro",
  member: "Membro",
  viewer: "Visitante",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let email = "ambiente local";
  let profileName = "Usuário";
  let userStores: { id: string; name: string; role?: string }[] = [];
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
      
      // Fetch user's stores with role
      const { data: memberships } = await supabase
        .from("store_memberships")
        .select("store_id, role, stores(name)")
        .eq("user_id", data.user.id);
        
      if (memberships) {
        userStores = memberships.map(m => ({
          id: m.store_id,
          name: (m.stores as { name?: string })?.name || "Loja Desconhecida",
          role: m.role as string
        }));
      }
      
      // If activeStoreId is not valid, reset it
      if (activeStoreId && !userStores.find(s => s.id === activeStoreId)) {
        activeStoreId = null;
      }
    }
  }

  const activeStore = userStores.find((store) => store.id === activeStoreId)
    ?? (userStores.length === 1 ? userStores[0] : null);

  const activeRoleLabel = activeStore?.role ? (ROLE_LABELS[activeStore.role] || activeStore.role) : "Usuário";

  const nameParts = profileName.trim().split(/\s+/);
  const initials = nameParts.length > 1
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : profileName.slice(0, 2).toUpperCase();

  const hasAdminPrivileges = userStores.some((s) =>
    ["admin", "secretary", "treasurer"].includes(s.role || "")
  );

  const overviewHref = activeStore ? `/lojas/${activeStore.id}` : "/";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CL</div>
          <div className="brand-copy">
            <strong>Controle da Loja</strong>
            <small>Administração</small>
          </div>
        </div>
        <nav className="nav" aria-label="Navegação principal">
          <Link href={overviewHref}><LayoutDashboard size={18}/><span>Visão geral</span></Link>
          {hasAdminPrivileges && (
            <Link href="/lojas"><Store size={18}/><span>Loja</span></Link>
          )}
          <Link href="/perfil"><User size={18}/><span>Meu Perfil</span></Link>
        </nav>
        {userStores.length > 1 && hasAdminPrivileges && (
          <StoreSwitcher stores={userStores} activeId={activeStoreId} />
        )}
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            {activeStore && (
              <>
                <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Loja ativa
                </p>
                <strong style={{ display: "block", marginTop: 3, color: "var(--navy)" }}>
                  {activeStore.name}
                </strong>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right", lineHeight: 1.25 }}>
              <strong style={{ display: "block", fontSize: 14, color: "var(--navy)", fontWeight: 600 }}>
                {profileName}
              </strong>
              <span className="subtle" style={{ fontSize: 12 }}>
                {activeRoleLabel}
              </span>
            </div>
            <div className="avatar" title={email}>{initials}</div>
            {hasSupabaseEnv() && (
              <form action={logout}>
                <button className="button" style={{ minHeight: 38 }}>Sair</button>
              </form>
            )}
          </div>
        </header>
        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
}
