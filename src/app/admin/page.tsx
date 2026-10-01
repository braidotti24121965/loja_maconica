import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: stats } = await supabase.rpc("get_platform_stats");
  const { data: stores } = await supabase.rpc("get_platform_stores");

  const safeStats = stats || { tenants: 0, stores: 0, brothers: 0 };
  const safeStores = stores || [];

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 28, margin: "0 0 8px 0", color: "#0f172a" }}>Painel da Plataforma</h1>
      <p style={{ color: "#64748b", marginBottom: 32 }}>Visão global do SaaS (Multi-tenant).</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
        <div style={{ background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", color: "#64748b", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Total de Clientes (Tenants)</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0f172a" }}>{safeStats.tenants}</div>
        </div>
        <div style={{ background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", color: "#64748b", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Lojas Ativas</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0f172a" }}>{safeStats.stores}</div>
        </div>
        <div style={{ background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", color: "#64748b", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Irmãos Cadastrados</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0f172a" }}>{safeStats.brothers}</div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Lojas na Plataforma</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: 13, textTransform: "uppercase" }}>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Nome da Loja</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Cliente (Tenant)</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {safeStores.map((store: Record<string, string | number>) => (
              <tr key={store.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "16px 24px", fontWeight: 500, color: "#0f172a" }}>{store.name}</td>
                <td style={{ padding: "16px 24px", color: "#475569" }}>{store.tenant_name}</td>
                <td style={{ padding: "16px 24px", color: "#64748b" }}>{new Date(store.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
