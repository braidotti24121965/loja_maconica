import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";

export const revalidate = 0;

export default async function MeuExtratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch the brother matching the user
  const { data: brother } = await supabase
    .from("brothers")
    .select("id, full_name")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!brother) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <h3>Membro não vinculado</h3>
        <p className="subtle">Seu perfil não está vinculado a um membro desta loja ou você não possui acesso ao extrato.</p>
        <Link href={`/lojas/${storeId}`} className="button" style={{ marginTop: 16 }}>Voltar para Loja</Link>
      </div>
    );
  }

  // Fetch dues for this brother
  const { data: dues } = await supabase
    .from("monthly_dues")
    .select("*")
    .eq("store_id", storeId)
    .eq("brother_id", brother.id)
    .order("competence", { ascending: false });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enrichedDues = (dues || []).map(due => {
    let currentStatus = due.status;
    if (currentStatus === "pending") {
      const dueDate = new Date(due.due_date);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        currentStatus = "overdue";
      }
    }
    return { ...due, status: currentStatus };
  });

  return (
    <div>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Loja
      </Link>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Meu Extrato</h1>
          <p className="subtle">Histórico de mensalidades e contribuições do irmão {brother.full_name}.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--subtle)" }}>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Competência</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Vencimento</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Valor</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {enrichedDues.map((due) => (
              <tr key={due.id} style={{ borderBottom: "1px solid var(--border)" }}>
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
                <td style={{ padding: "16px 24px", color: "var(--subtle)" }}>
                  {due.payment_date ? `${new Date(due.payment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} via ${due.payment_method}` : '-'}
                </td>
              </tr>
            ))}
            {enrichedDues.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--subtle)" }}>
                  <Wallet size={32} color="var(--subtle)" style={{ margin: "0 auto 16px auto" }} />
                  Nenhuma cobrança registrada em seu nome.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
