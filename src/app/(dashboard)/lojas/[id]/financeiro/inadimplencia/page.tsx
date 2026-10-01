import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, } from "lucide-react";


import DuesListClient from "./dues-list-client";

export const revalidate = 0;

export default async function InadimplenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Authentication & Authorization
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "treasurer"].includes(membership.role)) {
    redirect(`/lojas/${storeId}`);
  }

  // Fetch all brothers and their dues
  const { data: brothers } = await supabase
    .from("brothers")
    .select("id, full_name")
    .eq("store_id", storeId)
    .order("full_name");

  const { data: dues } = await supabase
    .from("monthly_dues")
    .select("*")
    .eq("store_id", storeId)
    .order("competence", { ascending: false });

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, name")
    .eq("store_id", storeId);

  const enrichedDues = (dues || []).map(due => {
    const brother = brothers?.find(b => b.id === due.brother_id);
    return { ...due, brotherName: brother?.full_name || "Desconhecido" };
  });

  const totalOverdue = enrichedDues.filter(d => d.status === "overdue").reduce((acc, curr) => acc + Number(curr.amount), 0);
  const overdueCount = enrichedDues.filter(d => d.status === "overdue").length;
  const totalPending = enrichedDues.filter(d => d.status === "pending").reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div>
      <Link href={`/lojas/${storeId}/financeiro`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Financeiro
      </Link>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Controle de Mensalidades</h1>
          <p className="subtle">Gere boletos, acompanhe pendências e veja os membros em atraso.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ borderLeft: "4px solid var(--danger)", padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, color: "var(--subtle)" }}>Inadimplência (Vencidos)</h3>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)", margin: 0 }}>
            R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: 13, color: "var(--subtle)", marginTop: 4 }}>{overdueCount} mensalidades vencidas</p>
        </div>
        <div className="card" style={{ borderLeft: "4px solid var(--gold)", padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, color: "var(--subtle)" }}>A Receber (No prazo)</h3>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <DuesListClient storeId={storeId} dues={enrichedDues} accounts={accounts || []} />

    </div>
  );
}
