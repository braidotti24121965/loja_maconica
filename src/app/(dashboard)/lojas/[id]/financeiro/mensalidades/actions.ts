"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function generateMonthlyDues(storeId: string, competence: string, amount: number, dueDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado" };

  // Get all brothers in this store
  const { data: brothers } = await supabase
    .from("brothers")
    .select("id")
    .eq("store_id", storeId);

  if (!brothers || brothers.length === 0) {
    return { error: "Nenhum irmão encontrado nesta loja." };
  }

  // Create dues payload
  const payload = brothers.map((b) => ({
    store_id: storeId,
    brother_id: b.id,
    competence,
    amount,
    due_date: dueDate,
    status: "pending"
  }));

  const { error } = await supabase
    .from("monthly_dues")
    .insert(payload);

  if (error) {
    if (error.code === '23505') {
      return { error: "Algumas mensalidades já foram geradas para esta competência. Verifique a lista de inadimplência." };
    }
    console.error(error);
    return { error: "Erro ao gerar mensalidades." };
  }

  revalidatePath(`/lojas/${storeId}/financeiro`);
  revalidatePath(`/lojas/${storeId}/financeiro/inadimplencia`);
  return { success: true };
}

export async function payMonthlyDue(dueId: string, storeId: string, paymentMethod: string, paymentDate: string, accountId: string) {
  const supabase = await createClient();
  
  // 1. Get due info
  const { data: due } = await supabase
    .from("monthly_dues")
    .select("*")
    .eq("id", dueId)
    .single();

  if (!due || due.status === "paid") return { error: "Mensalidade inválida ou já paga." };

  // 2. Get the "Mensalidade" category
  const { data: category } = await supabase
    .from("financial_categories")
    .select("id")
    .eq("store_id", storeId)
    .eq("name", "Mensalidade")
    .single();

  if (!category) return { error: "Categoria 'Mensalidade' não encontrada." };

  // 3. Create transaction
  const { data: transaction, error: txError } = await supabase
    .from("financial_transactions")
    .insert({
      store_id: storeId,
      account_id: accountId,
      category_id: category.id,
      brother_id: due.brother_id,
      type: "income",
      amount: due.amount,
      transaction_date: paymentDate,
      description: `Pagamento Mensalidade ${due.competence}`,
      status: "paid"
    })
    .select("id")
    .single();

  if (txError) return { error: "Erro ao registrar transação no caixa." };

  // 4. Update monthly due
  const { error: dueError } = await supabase
    .from("monthly_dues")
    .update({
      status: "paid",
      payment_date: paymentDate,
      payment_method: paymentMethod,
      transaction_id: transaction.id
    })
    .eq("id", dueId);

  if (dueError) return { error: "Erro ao atualizar status da mensalidade." };

  revalidatePath(`/lojas/${storeId}/financeiro`);
  revalidatePath(`/lojas/${storeId}/financeiro/inadimplencia`);
  return { success: true };
}

export async function updateMonthlyDueStatus(dueId: string, storeId: string, status: "exempt" | "canceled" | "pending") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_dues")
    .update({ status, payment_date: null, payment_method: null, transaction_id: null })
    .eq("id", dueId);

  if (error) return { error: "Erro ao atualizar status." };

  revalidatePath(`/lojas/${storeId}/financeiro`);
  revalidatePath(`/lojas/${storeId}/financeiro/inadimplencia`);
  return { success: true };
}
