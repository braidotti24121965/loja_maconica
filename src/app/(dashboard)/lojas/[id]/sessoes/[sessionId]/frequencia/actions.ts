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

  const toUpsert = data.map((item) => ({
    store_id: storeId,
    session_id: sessionId,
    brother_id: item.brother_id,
    status: item.status,
    justification: item.justification,
  }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_attendances")
    .upsert(toUpsert, { onConflict: "session_id, brother_id" });

  if (error) {
    console.error("Erro ao salvar frequência:", error.message);
    return { error: "Erro ao salvar os dados no banco." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes/${sessionId}/frequencia`);
  return { success: true };
}

export async function getSessionAttendances(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado.", attendances: [] };

  const { data, error } = await supabase
    .from("session_attendances")
    .select("brother_id, status, justification")
    .eq("session_id", sessionId);

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
