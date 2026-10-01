"use server";

import { requireStoreAdmin } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveAttendance(
  storeId: string,
  sessionId: string,
  data: Record<string, unknown>[],
) {
  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!session) return { error: "Sessão não encontrada nesta loja." };

  const brotherIds = [...new Set(data.map((item) => String(item.brother_id ?? "")))];
  if (brotherIds.some((id) => !id)) return { error: "Lista de frequência inválida." };

  const { data: brothers } = brotherIds.length
    ? await supabase
        .from("brothers")
        .select("id")
        .eq("store_id", storeId)
        .in("id", brotherIds)
    : { data: [] };
  if ((brothers?.length ?? 0) !== brotherIds.length) {
    return { error: "A lista contém irmão de outra loja ou cadastro inexistente." };
  }

  const toUpsert = data
    .filter((item) => item.status && String(item.status).trim() !== "")
    .map((item) => ({
      store_id: storeId,
      session_id: sessionId,
      brother_id: item.brother_id,
      status: item.status,
      justification: item.status === "justified" ? (item.justification as string | null) || null : null,
    }));

  const toDeleteBrotherIds = data
    .filter((item) => !item.status || String(item.status).trim() === "")
    .map((item) => String(item.brother_id));

  if (toUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from("session_attendances")
      .upsert(toUpsert, { onConflict: "session_id, brother_id" });

    if (upsertError) {
      console.error("Erro ao salvar frequência:", upsertError.message);
      return { error: "Erro ao salvar os dados no banco." };
    }
  }

  if (toDeleteBrotherIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("session_attendances")
      .delete()
      .eq("session_id", sessionId)
      .eq("store_id", storeId)
      .in("brother_id", toDeleteBrotherIds);

    if (deleteError) {
      console.error("Erro ao remover frequência desselecionada:", deleteError.message);
      return { error: "Erro ao atualizar os dados no banco." };
    }
  }

  revalidatePath(`/lojas/${storeId}/sessoes/${sessionId}/frequencia`);
  revalidatePath(`/lojas/${storeId}/sessoes`);
  return { success: true };
}

export async function getSessionAttendances(storeId: string, sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado.", attendances: [] };

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("user_id")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Não autorizado.", attendances: [] };

  const { data, error } = await supabase
    .from("session_attendances")
    .select("brother_id, status, justification")
    .eq("session_id", sessionId)
    .eq("store_id", storeId);

  if (error) return { error: "Erro ao atualizar a frequência.", attendances: [] };

  return { attendances: data || [] };
}

export async function openCheckinWindow(sessionId: string, storeId: string, hours: number = 4) {
  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { success: false, message: "Não autorizado." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_checkin_window", {
    p_session_id: sessionId,
    p_duration_hours: hours,
  });

  if (error) return { success: false, message: "Erro no servidor." };

  return data;
}

export async function closeCheckinWindow(sessionId: string, storeId: string) {
  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { success: false, message: "Não autorizado." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_checkin_window", {
    p_session_id: sessionId,
  });

  if (error) return { success: false, message: "Erro no servidor." };

  return data;
}
