"use client";

import { useState } from "react";
import { generateMonthlyDues, payMonthlyDue } from "../mensalidades/actions";

type Due = {
  id: string;
  brotherName: string;
  competence: string;
  due_date: string;
  amount: number;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
};

type Account = {
  id: string;
  name: string;
};

export default function DuesListClient({ storeId, dues, accounts }: { storeId: string, dues: Due[], accounts: Account[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [payModal, setPayModal] = useState<Due | null>(null);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const competence = formData.get("competence") as string;
    const amount = Number(formData.get("amount"));
    const dueDate = formData.get("due_date") as string;

    setIsGenerating(false);
    const res = await generateMonthlyDues(storeId, competence, amount, dueDate);
    if (res.error) alert(res.error);
    else alert("Mensalidades geradas com sucesso para todos os irmãos!");
  };

  const handlePay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payModal) return;
    
    const formData = new FormData(e.currentTarget);
    const accountId = formData.get("account_id") as string;
    const paymentDate = formData.get("payment_date") as string;
    const paymentMethod = formData.get("payment_method") as string;

    const res = await payMonthlyDue(payModal.id, storeId, paymentMethod, paymentDate, accountId);
    if (res.error) alert(res.error);
    else alert("Pagamento registrado com sucesso!");
    setPayModal(null);
  };

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Mensalidades Lançadas</h3>
        <button className="button" onClick={() => setIsGenerating(true)}>+ Gerar Mensalidades em Lote</button>
      </div>

      {isGenerating && (
        <div style={{ padding: 24, borderBottom: "1px solid var(--border)", background: "var(--page)" }}>
          <h4 style={{ margin: "0 0 16px 0" }}>Gerar para todos os Irmãos</h4>
          <form onSubmit={handleGenerate} style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 150 }}>
              <label>Competência (Ex: 2026-10)</label>
              <input type="text" name="competence" required className="input" placeholder="YYYY-MM" defaultValue={new Date().toISOString().slice(0,7)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 150 }}>
              <label>Valor Previsto (R$)</label>
              <input type="number" step="0.01" name="amount" required className="input" defaultValue="150.00" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 150 }}>
              <label>Data de Vencimento</label>
              <input type="date" name="due_date" required className="input" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="button" style={{ background: "var(--brand)", color: "white" }}>Gerar</button>
              <button type="button" className="button" onClick={() => setIsGenerating(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {payModal && (
        <div style={{ padding: 24, borderBottom: "1px solid var(--border)", background: "var(--green-soft)" }}>
          <h4 style={{ margin: "0 0 16px 0", color: "var(--green-dark)" }}>Registrar Pagamento: {payModal.brotherName}</h4>
          <form onSubmit={handlePay} style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 150 }}>
              <label>Conta de Destino</label>
              <select name="account_id" required className="input">
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 150 }}>
              <label>Data de Pagamento</label>
              <input type="date" name="payment_date" required className="input" defaultValue={new Date().toISOString().slice(0,10)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 150 }}>
              <label>Forma de Pagamento</label>
              <select name="payment_method" required className="input">
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="button" style={{ background: "var(--green-dark)", color: "white" }}>Confirmar Baixa</button>
              <button type="button" className="button" onClick={() => setPayModal(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--subtle)" }}>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Irmão</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Competência</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Vencimento</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Valor</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "12px 24px", fontWeight: 600, textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {dues.map((due) => (
              <tr key={due.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "16px 24px" }}>{due.brotherName}</td>
                <td style={{ padding: "16px 24px" }}>{due.competence}</td>
                <td style={{ padding: "16px 24px" }}>{new Date(due.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td style={{ padding: "16px 24px", fontWeight: 500 }}>R$ {Number(due.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: "16px 24px" }}>
                  <span style={{ 
                    display: "inline-block", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: due.status === 'paid' ? 'var(--green-soft)' : due.status === 'overdue' ? '#fee2e2' : 'var(--page)',
                    color: due.status === 'paid' ? 'var(--green-dark)' : due.status === 'overdue' ? 'var(--danger)' : 'var(--subtle)'
                  }}>
                    {due.status === 'paid' ? 'Pago' : due.status === 'overdue' ? 'Vencido' : due.status === 'pending' ? 'Pendente' : due.status}
                  </span>
                </td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  {due.status !== 'paid' && (
                    <button className="button" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => setPayModal(due)}>
                      Dar Baixa
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {dues.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--subtle)" }}>Nenhuma mensalidade registrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
