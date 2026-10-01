import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Database, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use server-side checking. Since we use RLS for the RPC, it works.
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: 400 }}>
          <ShieldAlert size={48} color="var(--danger)" style={{ margin: "0 auto 16px auto" }} />
          <h2 style={{ color: "var(--danger)", marginBottom: 8 }}>Acesso Restrito</h2>
          <p className="subtle" style={{ marginBottom: 24 }}>Esta área é reservada para o Dono da Plataforma.</p>
          <Link href="/lojas" className="button">Voltar para o Sistema</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>
      <aside style={{ width: 260, background: "#0f172a", color: "#fff", padding: 24, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
          <Database size={24} color="#38bdf8" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>SaaS Admin</h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <Link href="/admin" style={{ color: "#cbd5e1", textDecoration: "none", padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
            Visão Geral
          </Link>
          <Link href="/admin/auditoria" style={{ color: "#cbd5e1", textDecoration: "none", padding: "12px 16px", borderRadius: 8 }}>
            Logs de Auditoria
          </Link>
        </nav>

        <form action="/auth/signout" method="post">
          <button type="submit" style={{ background: "transparent", border: "none", color: "#ef4444", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 12, width: "100%", textAlign: "left" }}>
            <LogOut size={16} /> Sair do Painel
          </button>
        </form>
      </aside>
      
      <main style={{ flex: 1, padding: "48px 64px" }}>
        {children}
      </main>
    </div>
  );
}
