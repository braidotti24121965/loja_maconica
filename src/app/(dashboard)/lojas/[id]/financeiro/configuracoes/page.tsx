import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, Tags, Plus } from "lucide-react";
import { createAccount, createCategory } from "../actions";
import { revalidatePath } from "next/cache";

export default async function FinanceiroConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("financial_accounts").select("*").eq("store_id", storeId).order("name"),
    supabase.from("financial_categories").select("*").eq("store_id", storeId).order("name")
  ]);

  const incomes = categories?.filter(c => c.type === 'income') || [];
  const expenses = categories?.filter(c => c.type === 'expense') || [];

  return (
    <div>
      <Link href={`/lojas/${storeId}/financeiro`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Financeiro
      </Link>
      
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Configurações Financeiras</h1>
        <p className="subtle">Gerencie os caixas, contas bancárias e as categorias de receitas e despesas da sua Loja.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* CONTAS */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div className="icon" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}><Wallet size={20} /></div>
            <h2 style={{ fontSize: 18, margin: 0 }}>Contas e Caixas</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {accounts?.length === 0 && <p className="subtle">Nenhuma conta cadastrada.</p>}
            {accounts?.map(acc => (
              <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div>
                  <strong style={{ display: "block", fontSize: 14 }}>{acc.name}</strong>
                  <span className="subtle" style={{ fontSize: 12 }}>Saldo: R$ {Number(acc.balance).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
                {/* Delete button (future enhancement: check for transactions before deleting) */}
              </div>
            ))}
          </div>

          <form action={async (formData) => {
            "use server";
            const name = formData.get("name") as string;
            if (name) {
              await createAccount(storeId, name);
              revalidatePath(`/lojas/${storeId}/financeiro/configuracoes`);
            }
          }} style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <input type="text" name="name" required placeholder="Ex: Banco do Brasil" style={{ height: 38 }} />
            </div>
            <button type="submit" className="button" style={{ minHeight: 38, padding: "0 12px" }}>
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* CATEGORIAS */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div className="icon" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}><Tags size={20} /></div>
            <h2 style={{ fontSize: 18, margin: 0 }}>Categorias</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 14, color: "var(--green-dark)", marginBottom: 12 }}>Receitas (Entradas)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {incomes.map(c => (
                  <div key={c.id} style={{ padding: "8px 12px", background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}>
                    {c.name}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 14, color: "#8f2932", marginBottom: 12 }}>Despesas (Saídas)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {expenses.map(c => (
                  <div key={c.id} style={{ padding: "8px 12px", background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}>
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form action={async (formData) => {
            "use server";
            const name = formData.get("name") as string;
            const type = formData.get("type") as 'income' | 'expense';
            if (name && type) {
              await createCategory(storeId, name, type);
              revalidatePath(`/lojas/${storeId}/financeiro/configuracoes`);
            }
          }} style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <input type="text" name="name" required placeholder="Nova categoria..." style={{ height: 38 }} />
            </div>
            <div className="field" style={{ width: 120, marginBottom: 0 }}>
              <select name="type" style={{ height: 38 }}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <button type="submit" className="button" style={{ minHeight: 38, padding: "0 12px" }}>
              <Plus size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
