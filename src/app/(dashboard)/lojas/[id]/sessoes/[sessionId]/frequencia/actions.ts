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
