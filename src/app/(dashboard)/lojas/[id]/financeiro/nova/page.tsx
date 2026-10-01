import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { addTransaction } from "../actions";

export default async function NovaTransacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: accounts }, { data: categories }, { data: brothers }] = await Promise.all([
    supabase.from("financial_accounts").select("id, name").eq("store_id", storeId),
    supabase.from("financial_categories").select("id, name, type").eq("store_id", storeId),
    supabase.from("brothers").select("id, full_name").eq("store_id", storeId)
  ]);

  if (!accounts || accounts.length === 0) {
    // If no account exists, we can't create a transaction
    return (
      <div className="card">
        <h3>Crie uma Conta Primeiro</h3>
        <p className="subtle">Você precisa de pelo menos uma conta (ex: Conta Corrente) para lançar transações.</p>
        <Link href={`/lojas/${storeId}/financeiro/configuracoes`} className="button">Criar Conta Bancária</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}/financeiro`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Financeiro
      </Link>
      
      <h1 style={{ fontSize: 24, margin: "0 0 24px 0" }}>Novo Lançamento</h1>

      <form action={async (formData) => {
        "use server";
        const data = {
          account_id: formData.get("account_id"),
          category_id: formData.get("category_id"),
          brother_id: formData.get("brother_id") || null,
          type: formData.get("type"),
          amount: parseFloat(formData.get("amount") as string),
          transaction_date: formData.get("transaction_date"),
          description: formData.get("description"),
          status: formData.get("status")
        };
        await addTransaction(storeId, data);
        redirect(`/lojas/${storeId}/financeiro`);
      }} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        
        <div className="field">
          <label>Tipo de Lançamento</label>
          <select name="type" required className="input">
            <option value="income">Receita (Entrada)</option>
            <option value="expense">Despesa (Saída)</option>
          </select>
        </div>

        <div className="field">
          <label>Conta</label>
          <select name="account_id" required className="input">
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Categoria</label>
          <select name="category_id" required className="input">
            <option value="" disabled selected>Selecione uma categoria...</option>
            {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Valor (R$)</label>
          <input type="number" step="0.01" min="0.01" name="amount" required className="input" placeholder="0,00" />
        </div>

        <div className="field">
          <label>Data</label>
          <input type="date" name="transaction_date" required className="input" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>

        <div className="field">
          <label>Descrição</label>
          <input type="text" name="description" required className="input" placeholder="Ex: Mensalidade de Janeiro" />
        </div>

        <div className="field">
          <label>Irmão Vinculado (Opcional)</label>
          <select name="brother_id" className="input">
            <option value="">Nenhum (Despesa Geral / Receita Avulsa)</option>
            {brothers?.map(br => <option key={br.id} value={br.id}>{br.full_name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Status</label>
          <select name="status" required className="input">
            <option value="paid">Pago / Concluído</option>
            <option value="pending">Pendente / A Pagar</option>
          </select>
        </div>

        <button type="submit" className="button" style={{ marginTop: 16 }}>Salvar Lançamento</button>
      </form>
    </div>
  );
}
