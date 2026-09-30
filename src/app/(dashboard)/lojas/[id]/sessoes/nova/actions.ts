"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SESSION_TYPES = new Set([
  "Sessão Ordinária",
  "Sessão Magna",
  "Sessão Branca",
  "Sessão de Iniciação",
  "Sessão de Elevação",
  "Sessão de Exaltação",
  "Outra",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createSession(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = String(data.get("store_id") ?? "");
  const date = String(data.get("date") ?? "");
  const sessionType = String(data.get("session_type") ?? "");
  const description = String(data.get("description") ?? "").trim();

  if (!UUID_PATTERN.test(storeId) || !DATE_PATTERN.test(date) || !SESSION_TYPES.has(sessionType)) {
    return { error: "Dados da sessão inválidos." };
  }

  if (description.length > 2000) {
    return { error: "A descrição deve ter no máximo 2.000 caracteres." };
  }

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership || !["admin", "secretary"].includes(membership.role)) {
    return { error: "Você não tem permissão para registrar sessões nesta loja." };
  }

  const { error } = await supabase
    .from("sessions")
    .insert({
      store_id: storeId,
      date,
      session_type: sessionType,
      description,
      created_by: userData.user.id
    });

  if (error) {
    console.error("Erro ao criar sessão:", error);
    return { error: "Falha ao registrar sessão. Verifique suas permissões." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes`);
  redirect(`/lojas/${storeId}/sessoes`);
}
