"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateRole(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = data.get("store_id") as string;
  const userId = data.get("user_id") as string;
  const role = data.get("role") as string;

  if (!storeId || !userId || !role) return { error: "Dados inválidos" };

  const { error } = await supabase
    .from("store_memberships")
    .update({ role })
    .eq("store_id", storeId)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao atualizar papel:", error);
    return { error: "Falha ao atualizar. Verifique permissões." };
  }

  revalidatePath(`/lojas/${storeId}/membros`);
  return { success: true };
}

export async function removeMember(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = data.get("store_id") as string;
  const userId = data.get("user_id") as string;

  if (!storeId || !userId) return { error: "Dados inválidos" };

  const { error } = await supabase
    .from("store_memberships")
    .delete()
    .eq("store_id", storeId)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao remover membro:", error);
    return { error: "Falha ao remover. Verifique permissões." };
  }

  revalidatePath(`/lojas/${storeId}/membros`);
  return { success: true };
}
