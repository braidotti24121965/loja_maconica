import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ChartsClient from "./charts-client";

export const revalidate = 0;

export default async function RelatoriosFinanceirosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check treasurer access
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "treasurer"].includes(membership.role)) {
    redirect(`/lojas/${storeId}`);
  }

  // Fetch transactions for the current year
  const currentYearStr = new Date().getFullYear().toString();
  const { data: transactions } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("store_id", storeId)
    .gte("transaction_date", `${currentYearStr}-01-01`)
    .lte("transaction_date", `${currentYearStr}-12-31`)
    .order("transaction_date", { ascending: true });

  // Calculate totals
  const totalReceitas = (transactions || []).filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalDespesas = (transactions || []).filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalPendente = (transactions || []).filter(t => t.status === 'pending').reduce((acc, t) => acc + Number(t.amount), 0);

  // Group by month for chart
  const monthlyData: Record<string, { month: string, receitas: number, despesas: number }> = {};
  
  // Initialize 12 months
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  monthNames.forEach((m, idx) => {
    monthlyData[String(idx + 1).padStart(2, '0')] = { month: m, receitas: 0, despesas: 0 };
  });

  (transactions || []).forEach(t => {
    if (t.status !== 'paid') return;
    const m = t.transaction_date.substring(5, 7); // YYYY-MM-DD
    if (monthlyData[m]) {
      if (t.type === 'income') monthlyData[m].receitas += Number(t.amount);
      if (t.type === 'expense') monthlyData[m].despesas += Number(t.amount);
    }
  });

  const chartData = Object.keys(monthlyData).sort().map(k => monthlyData[k]);

  return (
    <div>
      <Link href={`/lojas/${storeId}/financeiro`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Financeiro
      </Link>
      
      <h1 style={{ fontSize: 24, margin: "0 0 24px 0" }}>Relatórios Financeiros</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ borderTop: "4px solid var(--green-dark)" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, color: "var(--subtle)" }}>Total Receitas (Ano)</h3>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--green-dark)", margin: 0 }}>R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card" style={{ borderTop: "4px solid var(--danger)" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, color: "var(--subtle)" }}>Total Despesas (Ano)</h3>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)", margin: 0 }}>R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card" style={{ borderTop: "4px solid var(--gold)" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, color: "var(--subtle)" }}>Contas Pendentes</h3>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: 0 }}>R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 24 }}>Receitas vs Despesas ({currentYearStr})</h2>
        <ChartsClient data={chartData} />
      </div>
    </div>
  );
}
