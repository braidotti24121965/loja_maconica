"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function isStoreAdminOrSecretary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  userId: string
) {
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(membership && ["admin", "secretary"].includes(membership.role));
}

function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function updateSession(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { error: "Não autorizado." };
  }

  const storeId = String(data.get("store_id") ?? "");
  const sessionId = String(data.get("session_id") ?? "");
  const sessionType = String(data.get("session_type") ?? "").trim();
  const date = String(data.get("date") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();

  if (!storeId || !sessionId || !sessionType || !date) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const isAdmin = await isStoreAdminOrSecretary(supabase, storeId, userData.user.id);
  if (!isAdmin) {
    return { error: "Apenas administradores e secretários podem editar sessões." };
  }

  // Fetch target session
  const { data: targetSession } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!targetSession) {
    return { error: "Sessão não encontrada nesta loja." };
  }

  const todayStr = getTodayString();
  if (targetSession.date < todayStr) {
    return { error: "Apenas sessões futuras ou da data atual podem ser editadas." };
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      session_type: sessionType,
      date: date,
      description: description || null,
    })
    .eq("id", sessionId)
    .eq("store_id", storeId);

  if (error) {
    console.error("Erro ao atualizar sessão:", error);
    return { error: "Falha ao atualizar sessão. Verifique os dados." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes`);
  revalidatePath(`/lojas/${storeId}`);
  return { success: true };
}

export async function deleteSession(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { error: "Não autorizado." };
  }

  const storeId = String(data.get("store_id") ?? "");
  const sessionId = String(data.get("session_id") ?? "");

  if (!storeId || !sessionId) {
    return { error: "Dados inválidos." };
  }

  const isAdmin = await isStoreAdminOrSecretary(supabase, storeId, userData.user.id);
  if (!isAdmin) {
    return { error: "Apenas administradores e secretários podem excluir sessões." };
  }

  // Fetch target session and count attendance movements
  const { data: targetSession } = await supabase
    .from("sessions")
    .select("id, date, session_attendances(count)")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!targetSession) {
    return { error: "Sessão não encontrada nesta loja." };
  }

  const todayStr = getTodayString();
  if (targetSession.date < todayStr) {
    return { error: "Apenas sessões futuras podem ser excluídas." };
  }

  const attendanceCount = Array.isArray(targetSession.session_attendances)
    ? Number(targetSession.session_attendances[0]?.count || 0)
    : 0;

  if (attendanceCount > 0) {
    return {
      error: `Esta sessão possui ${attendanceCount} registro(s) de frequência associado(s) e não pode ser excluída.`,
    };
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("store_id", storeId);

  if (error) {
    console.error("Erro ao excluir sessão:", error);
    return { error: "Não foi possível excluir a sessão." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes`);
  revalidatePath(`/lojas/${storeId}`);
  return { success: true };
}
