"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_PDF_SIZE = 5 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function uploadAta(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = String(data.get("store_id") ?? "");
  const sessionId = String(data.get("session_id") ?? "");
  const file = data.get("file");

  if (!UUID_PATTERN.test(storeId) || !UUID_PATTERN.test(sessionId) || !(file instanceof File)) {
    return { error: "Dados do envio inválidos." };
  }

  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Envie somente um arquivo PDF." };
  }

  if (file.size === 0 || file.size > MAX_PDF_SIZE) {
    return { error: "O PDF deve ter até 5 MB." };
  }

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership || !["admin", "secretary"].includes(membership.role)) {
    return { error: "Você não tem permissão para anexar atas nesta loja." };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!session) {
    return { error: "Sessão não encontrada nesta loja." };
  }

  // 1. Upload to storage
  const filePath = `${storeId}/${sessionId}_ata.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("store_documents")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Storage Error:", uploadError);
    return { error: "Erro ao enviar arquivo para o cofre." };
  }

  // 2. Insert or update metadata into documents table
  const { data: existingDoc } = await supabase
    .from("documents")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  let dbError;
  if (existingDoc) {
    const { error } = await supabase
      .from("documents")
      .update({
        title: "Ata da Sessão",
        file_path: filePath,
        uploaded_by: userData.user.id
      })
      .eq("id", existingDoc.id);
    dbError = error;
  } else {
    const { error } = await supabase
      .from("documents")
      .insert({
        store_id: storeId,
        session_id: sessionId,
        title: "Ata da Sessão",
        file_path: filePath,
        uploaded_by: userData.user.id
      });
    dbError = error;
  }

  if (dbError) {
    console.error("DB Error:", dbError);
    return { error: "Erro ao salvar registro do documento." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes`);
  revalidatePath(`/lojas/${storeId}/sessoes/${sessionId}/ata`);
  return { success: true };
}
