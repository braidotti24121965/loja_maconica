"use server";

import { requireStoreAdmin } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateStore(data: FormData) {
  const storeId = data.get("store_id") as string;
  if (!storeId) return { error: "Não autorizado" };

  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const name = data.get("name") as string;
  const city = data.get("city") as string;
  const state = data.get("state") as string;
  const active = data.get("active") === "on";

  if (!name) return { error: "Nome inválido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({ name, city, state, active })
    .eq("id", storeId);

  if (error) {
    console.error("Erro ao atualizar loja:", error);
    return { error: "Falha ao atualizar dados. Verifique permissões." };
  }

  revalidatePath(`/lojas`);
  revalidatePath(`/lojas/${storeId}`);
  return { success: true };
}
