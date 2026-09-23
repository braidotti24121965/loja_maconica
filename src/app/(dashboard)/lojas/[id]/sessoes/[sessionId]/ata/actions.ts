"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadAta(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = data.get("store_id") as string;
  const sessionId = data.get("session_id") as string;
  const file = data.get("file") as File;

  if (!storeId || !sessionId || !file) return { error: "Dados inválidos" };

  // 1. Upload to storage
  const fileExt = file.name.split('.').pop();
  const filePath = `${storeId}/${sessionId}_ata.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("store_documents")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Storage Error:", uploadError);
    return { error: "Erro ao enviar arquivo para o cofre." };
  }

  // 2. Insert metadata into documents table
  const { error: dbError } = await supabase
    .from("documents")
    .insert({
      store_id: storeId,
      session_id: sessionId,
      title: "Ata da Sessão",
      file_path: filePath,
      uploaded_by: userData.user.id
    });

  if (dbError) {
    console.error("DB Error:", dbError);
    // Tenta limpar o arquivo se falhou no DB
    await supabase.storage.from("store_documents").remove([filePath]);
    return { error: "Erro ao salvar registro do documento." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes`);
  revalidatePath(`/lojas/${storeId}/sessoes/${sessionId}/ata`);
  return { success: true };
}
