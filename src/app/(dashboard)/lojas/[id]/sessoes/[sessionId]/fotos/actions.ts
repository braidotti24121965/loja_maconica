"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function getSessionAdmin(storeId: string, sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autorizado." } as const;

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["admin", "secretary"].includes(membership.role)) {
    return { error: "Você não tem permissão para gerenciar a galeria da sessão." } as const;
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!session) return { error: "Sessão não encontrada nesta loja." } as const;

  return { supabase, user } as const;
}

export async function uploadSessionPhoto(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const sessionId = String(data.get("session_id") ?? "");
  const file = data.get("file");

  if (!UUID_PATTERN.test(storeId) || !UUID_PATTERN.test(sessionId) || !(file instanceof File)) {
    return { error: "Dados inválidos." };
  }
  const extension = IMAGE_EXTENSIONS[file.type] || "webp";
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return { error: "Use uma imagem de até 5 MB." };
  }

  const access = await getSessionAdmin(storeId, sessionId);
  if ("error" in access) return access;

  const { count } = await access.supabase
    .from("session_photos")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("store_id", storeId);
  if ((count ?? 0) >= 20) return { error: "Esta sessão já possui o limite de 20 fotos." };

  const filePath = `${storeId}/${sessionId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await access.supabase.storage
    .from("store_media")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) return { error: "Falha ao enviar arquivo para o servidor." };

  const { error: dbError } = await access.supabase.from("session_photos").insert({
    session_id: sessionId,
    store_id: storeId,
    storage_path: filePath,
    uploaded_by: access.user.id,
  });

  if (dbError) {
    await access.supabase.storage.from("store_media").remove([filePath]);
    return { error: "Falha ao registrar foto." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes/${sessionId}/fotos`);
  return { success: true };
}

export async function deleteSessionPhoto(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const sessionId = String(data.get("session_id") ?? "");
  const photoId = String(data.get("photo_id") ?? "");

  if (![storeId, sessionId, photoId].every((value) => UUID_PATTERN.test(value))) {
    return { error: "Dados inválidos." };
  }

  const access = await getSessionAdmin(storeId, sessionId);
  if ("error" in access) return access;

  const { data: deletedPhoto, error: deleteError } = await access.supabase
    .from("session_photos")
    .delete()
    .eq("id", photoId)
    .eq("session_id", sessionId)
    .eq("store_id", storeId)
    .select("id, storage_path")
    .maybeSingle();

  if (deleteError || !deletedPhoto) return { error: "Foto não encontrada ou sem permissão." };

  await access.supabase.storage
    .from("store_media")
    .remove([deletedPhoto.storage_path]);

  revalidatePath(`/lojas/${storeId}/sessoes/${sessionId}/fotos`);
  return { success: true };
}
