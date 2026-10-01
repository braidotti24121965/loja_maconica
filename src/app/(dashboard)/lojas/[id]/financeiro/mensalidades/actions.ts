"use server";

import { requireStoreTreasurer } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function generateMonthlyDues(
  storeId: string,
  competence: string,
  amount: number,
  dueDate: string,
) {
  try {
    await requireStoreTreasurer(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { data: brothers } = await supabase
    .from("brothers")
    .select("id")
    .eq("store_id", storeId);

  if (!brothers || brothers.length === 0) {
    return { error: "Nenhum irmão encontrado nesta loja." };
  }

  const payload = brothers.map((b) => ({
    store_id: storeId,
    brother_id: b.id,
    competence,
    amount,
    due_date: dueDate,
    status: "pending",
  }));

  const { error } = await supabase.from("monthly_dues").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "Algumas mensalidades já foram geradas para esta competência. Verifique a lista de inadimplência.",
      };
    }
    console.error("Erro ao gerar mensalidades:", error.message);
    return { error: "Erro ao gerar mensalidades." };
  }

  revalidatePath(`/lojas/${storeId}/financeiro`);
  revalidatePath(`/lojas/${storeId}/financeiro/inadimplencia`);
  return { success: true };
}

export async function payMonthlyDue(
  dueId: string,
  storeId: string,
  paymentMethod: string,
  paymentDate: string,
  accountId: string,
) {
  try {
    await requireStoreTreasurer(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_monthly_due", {
    p_due_id: dueId,
    p_store_id: storeId,
    p_payment_method: paymentMethod,
    p_payment_date: paymentDate,
    p_account_id: accountId,
  });

  if (error) {
    console.error("Erro ao baixar mensalidade:", error.code);
    return { error: "Não foi possível registrar o pagamento da mensalidade." };
  }

  revalidatePath(`/lojas/${storeId}/financeiro`);
  revalidatePath(`/lojas/${storeId}/financeiro/inadimplencia`);
  return { success: true };
}

export async function updateMonthlyDueStatus(
  dueId: string,
  storeId: string,
  status: "exempt" | "canceled" | "pending",
) {
  try {
    await requireStoreTreasurer(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { data: updatedDue, error } = await supabase
    .from("monthly_dues")
    .update({
      status,
      payment_date: null,
      payment_method: null,
      transaction_id: null,
    })
    .eq("id", dueId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Erro ao atualizar status." };
  }
  if (!updatedDue) {
    return { error: "Nenhuma mensalidade foi atualizada. Registro não encontrado." };
  }

  revalidatePath(`/lojas/${storeId}/financeiro`);
  revalidatePath(`/lojas/${storeId}/financeiro/inadimplencia`);
  return { success: true };
}
