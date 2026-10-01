import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, Settings } from "lucide-react";

export default async function FinanceiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check store membership and treasurer access
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "treasurer"].includes(membership.role)) {
    redirect(`/lojas/${storeId}`);
  }

  // Fetch accounts
  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("store_id", storeId)
    .order("name");

  return (
    <div>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Loja
      </Link>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Tesouraria e Financeiro</h1>
          <p className="subtle">Controle de saldos, contas a pagar, receber e mensalidades.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href={`/lojas/${storeId}/financeiro/configuracoes`} className="button" style={{ background: "#475569", color: "white", gap: 8 }}>
            <Settings size={18} />
            Configurações
          </Link>
          <Link href={`/lojas/${storeId}/financeiro/nova`} className="button" style={{ gap: 8 }}>
            <TrendingUp size={18} />
            Novo Lançamento
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 32 }}>
        {accounts?.length ? accounts.map((acc) => (
          <div key={acc.id} className="card">
            <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{acc.name}</h3>
            <p style={{ fontSize: 24, fontWeight: 600, color: acc.balance >= 0 ? 'var(--green-dark)' : 'red' }}>
              R$ {Number(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )) : (
          <div className="card" style={{ textAlign: "center", padding: 24, gridColumn: "1 / -1" }}>
            <Wallet size={32} color="var(--subtle)" style={{ margin: "0 auto 16px auto" }} />
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Nenhuma conta configurada</h3>
            <p className="subtle">Crie a primeira conta (ex: Conta Corrente ou Caixa) para começar a lançar transações.</p>
          </div>
        )}
        
        <Link href={`/lojas/${storeId}/financeiro/inadimplencia`} className="card" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Mensalidades e Inadimplência</h3>
          <p className="subtle" style={{ textAlign: "center", margin: 0 }}>Gerar boletos em lote e ver atrasos</p>
        </Link>
        <Link href={`/lojas/${storeId}/financeiro/relatorios`} className="card" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Gráficos e Relatórios</h3>
          <p className="subtle" style={{ textAlign: "center", margin: 0 }}>Receitas, despesas e evolução anual</p>
        </Link>
      </div>
      
      {/* TODO: Add transactions list and action buttons */}
    </div>
  );
}
