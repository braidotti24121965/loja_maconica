import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, Users, FileText } from "lucide-react";

export default async function LojaDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch store details and verify membership
  const { data: store } = await supabase
    .from("stores")
    .select("*, store_memberships(role)")
    .eq("id", storeId)
    .single();

  const role = (store?.store_memberships as any)?.[0]?.role;

  if (!store || !role) {
    return (
      <div className="card">
        <h3>Acesso Negado</h3>
        <p className="subtle">Você não tem acesso a esta loja.</p>
        <Link href="/lojas" className="button" style={{ marginTop: 16, display: "inline-block" }}>Voltar</Link>
      </div>
    );
  }

  const isAdmin = ["admin", "secretary"].includes(role);
  
  // Dashboard Metrics
  const { count: totalBrothers } = await supabase
    .from("brothers")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { data: degreeStats } = await supabase
    .from("brothers")
    .select("degree")
    .eq("store_id", storeId);

  const { count: totalAcessos } = await supabase
    .from("store_memberships")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { data: lastSession } = await supabase
    .from("sessions")
    .select("date, session_type")
    .eq("store_id", storeId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mestresCount = degreeStats?.filter(b => b.degree.includes("Mestre")).length || 0;
  const companheirosCount = degreeStats?.filter(b => b.degree === "Companheiro").length || 0;
  const aprendizesCount = degreeStats?.filter(b => b.degree === "Aprendiz").length || 0;

  return (
    <div>
      <Link href="/lojas" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Lojas
      </Link>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>{store.name}</h1>
          <p className="subtle">Visão Geral • Seu papel no sistema: {role}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
        <div className="card" style={{ padding: 24 }}>
          <p className="subtle" style={{ margin: "0 0 8px 0", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>Quadro de Obreiros</p>
          <h2 style={{ fontSize: 32, margin: "0 0 16px 0", color: "var(--text)" }}>{totalBrothers || 0}</h2>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--subtle)" }}>
            <span>M: <strong>{mestresCount}</strong></span>
            <span>C: <strong>{companheirosCount}</strong></span>
            <span>A: <strong>{aprendizesCount}</strong></span>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <p className="subtle" style={{ margin: "0 0 8px 0", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>Última Sessão</p>
          <h2 style={{ fontSize: 24, margin: "0 0 16px 0", color: "var(--text)" }}>
            {lastSession ? new Date(lastSession.date).toLocaleDateString("pt-BR") : "--"}
          </h2>
          <span className="badge">{lastSession?.session_type || "Nenhuma registrada"}</span>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <p className="subtle" style={{ margin: "0 0 8px 0", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>Acessos Ativos</p>
          <h2 style={{ fontSize: 32, margin: "0 0 16px 0", color: "var(--text)" }}>{totalAcessos || 0}</h2>
          <span style={{ fontSize: 13, color: "var(--subtle)" }}>Irmãos com login no sistema</span>
        </div>
      </div>

      <h3 style={{ marginBottom: 16 }}>Atalhos da Loja</h3>
      <div className="section-grid">
        <Link href={`/lojas/${storeId}/sessoes`} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div className="icon"><FileText size={20} /></div>
            <h3 style={{ margin: 0 }}>Sessões e Atas</h3>
          </div>
          <p className="subtle">Calendário de sessões, pautas e documentos anexos.</p>
        </Link>
        
        <Link href={`/lojas/${storeId}/membros`} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div className="icon"><Users size={20} /></div>
            <h3 style={{ margin: 0 }}>Membros</h3>
          </div>
          <p className="subtle">Gerencie os membros da loja e seus respectivos cargos.</p>
        </Link>
        
        {isAdmin && (
          <Link href={`/lojas/${storeId}/configuracoes`} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div className="icon"><Settings size={20} /></div>
              <h3 style={{ margin: 0 }}>Configurações</h3>
            </div>
            <p className="subtle">Altere nome, número e endereço da loja.</p>
          </Link>
        )}
      </div>
    </div>
  );
}
