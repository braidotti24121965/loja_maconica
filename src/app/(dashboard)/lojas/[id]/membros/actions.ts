"use server";

import { requireStoreAdmin } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_ROLES = new Set(["admin", "secretary", "treasurer", "member", "viewer"]);

export async function updateRole(data: FormData) {
  const storeId = data.get("store_id") as string;
  const userId = data.get("user_id") as string;
  const role = data.get("role") as string;

  if (!storeId || !userId || !role) return { error: "Dados inválidos" };
  if (!VALID_ROLES.has(role)) return { error: "Papel inválido" };

  let actor;
  try {
    actor = await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return { error: "Membro não encontrado nesta loja." };
  if (actor.userId === userId) return { error: "Você não pode alterar o próprio papel." };
  if (actor.role === "secretary" && (target.role !== "member" && target.role !== "viewer")) {
    return { error: "Secretários só podem alterar membros e visualizadores." };
  }
  if (actor.role === "secretary" && !["member", "viewer"].includes(role)) {
    return { error: "Secretários não podem conceder papéis administrativos." };
  }

  const { data: updatedMember, error } = await supabase
    .from("store_memberships")
    .update({ role })
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    console.error("Erro ao atualizar papel:", error);
    return { error: "Falha ao atualizar. Verifique permissões." };
  }
  if (!updatedMember) {
    return { error: "Membro não encontrado nesta loja." };
  }

  revalidatePath(`/lojas/${storeId}/membros`);
  return { success: true };
}

export async function removeMember(data: FormData) {
  const storeId = data.get("store_id") as string;
  const userId = data.get("user_id") as string;

  if (!storeId || !userId) return { error: "Dados inválidos" };

  let actor;
  try {
    actor = await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return { error: "Membro não encontrado nesta loja." };
  if (actor.userId === userId) return { error: "Você não pode remover o próprio acesso." };
  if (actor.role === "secretary" && target.role !== "member" && target.role !== "viewer") {
    return { error: "Secretários só podem remover membros e visualizadores." };
  }

  const { data: removedMember, error } = await supabase
    .from("store_memberships")
    .delete()
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    console.error("Erro ao remover membro:", error);
    return { error: "Falha ao remover. Verifique permissões." };
  }
  if (!removedMember) {
    return { error: "Membro não encontrado nesta loja." };
  }

  revalidatePath(`/lojas/${storeId}/membros`);
  return { success: true };
}
