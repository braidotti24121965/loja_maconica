"use server";

import { requireStoreTreasurer } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAccount(storeId: string, name: string) {
  await requireStoreTreasurer(storeId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_accounts")
    .insert({ store_id: storeId, name, balance: 0 });
  if (error) throw new Error(error.message);
  revalidatePath(`/lojas/${storeId}/financeiro`);
}

export async function createCategory(
  storeId: string,
  name: string,
  type: "income" | "expense",
) {
  await requireStoreTreasurer(storeId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_categories")
    .insert({ store_id: storeId, name, type });
  if (error) throw new Error(error.message);
  revalidatePath(`/lojas/${storeId}/financeiro`);
}

export async function addTransaction(
  storeId: string,
  data: Record<string, unknown>,
) {
  await requireStoreTreasurer(storeId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_financial_transaction", {
    p_store_id: storeId,
    p_account_id: data.account_id,
    p_category_id: data.category_id,
    p_brother_id: data.brother_id || null,
    p_type: data.type,
    p_amount: data.amount,
    p_transaction_date: data.transaction_date,
    p_description: data.description,
    p_status: data.status,
  });

  if (error) {
    console.error("Erro ao criar lançamento financeiro:", error.code);
    throw new Error("Não foi possível salvar o lançamento financeiro.");
  }

  revalidatePath(`/lojas/${storeId}/financeiro`);
}
