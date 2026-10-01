"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveAttendance(storeId: string, sessionId: string, data: Record<string, unknown>[]) {
  const supabase = await createClient();

  // First, delete existing attendances for this session to replace them (or we can upsert)
  // Upsert is better:
  const toUpsert = data.map(item => ({
    store_id: storeId,
    session_id: sessionId,
    brother_id: item.brother_id,
    status: item.status,
    justification: item.justification
  }));

  const { error } = await supabase
    .from("session_attendances")
    .upsert(toUpsert, { onConflict: "session_id, brother_id" });

  if (error) {
    console.error(error);
    return { error: "Erro ao salvar os dados no banco." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes/${sessionId}/frequencia`);
  return { success: true };
}

export async function getSessionAttendances(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado.", attendances: [] };

  const { data, error } = await supabase
    .from("session_attendances")
    .select("brother_id, status, justification")
    .eq("session_id", sessionId);

  if (error) return { error: "Erro ao atualizar a frequência.", attendances: [] };

  return { attendances: data || [] };
}

export async function openCheckinWindow(sessionId: string, hours: number = 4) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Não autenticado." };

  const { data, error } = await supabase.rpc("open_checkin_window", {
    p_session_id: sessionId,
    p_duration_hours: hours
  });

  if (error) return { success: false, message: "Erro no servidor." };

  return data;
}

export async function closeCheckinWindow(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Não autenticado." };

  const { data, error } = await supabase.rpc("close_checkin_window", {
    p_session_id: sessionId
  });

  if (error) return { success: false, message: "Erro no servidor." };

  return data;
}
