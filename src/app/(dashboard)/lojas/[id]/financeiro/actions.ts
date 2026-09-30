"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAccount(storeId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_accounts").insert({ store_id: storeId, name, balance: 0 });
  if (error) throw new Error(error.message);
  revalidatePath(`/lojas/${storeId}/financeiro`);
}

export async function createCategory(storeId: string, name: string, type: 'income' | 'expense') {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_categories").insert({ store_id: storeId, name, type });
  if (error) throw new Error(error.message);
  revalidatePath(`/lojas/${storeId}/financeiro`);
}

export async function addTransaction(storeId: string, data: any) {
  const supabase = await createClient();
  
  // Create transaction
  const { error: txError } = await supabase.from("financial_transactions").insert({
    store_id: storeId,
    account_id: data.account_id,
    category_id: data.category_id,
    type: data.type,
    amount: data.amount,
    transaction_date: data.transaction_date,
    description: data.description,
    status: data.status,
    brother_id: data.brother_id || null
  });

  if (txError) throw new Error(txError.message);

  // If paid, update account balance
  if (data.status === 'paid') {
    const { data: account } = await supabase.from("financial_accounts").select("balance").eq("id", data.account_id).single();
    if (account) {
      const newBalance = data.type === 'income' 
        ? Number(account.balance) + Number(data.amount)
        : Number(account.balance) - Number(data.amount);
        
      await supabase.from("financial_accounts").update({ balance: newBalance }).eq("id", data.account_id);
    }
  }

  revalidatePath(`/lojas/${storeId}/financeiro`);
}
