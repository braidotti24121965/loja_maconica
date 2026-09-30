"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveEvent(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = String(data.get("store_id") ?? "");
  const eventId = data.get("event_id") ? String(data.get("event_id")) : null;
  
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const event_date = String(data.get("event_date") ?? "");
  const event_time = data.get("event_time") ? String(data.get("event_time")) : null;
  const location = String(data.get("location") ?? "").trim();
  const status = String(data.get("status") ?? "published");

  if (!storeId || !title || !event_date) {
    return { error: "Título e Data são obrigatórios." };
  }

  // Verificar permissão
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userData.user.id)
    .single();

  if (!membership || !["admin", "secretary"].includes(membership.role)) {
    return { error: "Você não tem permissão para gerenciar eventos." };
  }

  if (eventId) {
    // Update
    const { error } = await supabase
      .from("events")
      .update({ title, description, event_date, event_time, location, status })
      .eq("id", eventId)
      .eq("store_id", storeId);
      
    if (error) return { error: "Erro ao atualizar evento." };
  } else {
    // Insert
    const { error } = await supabase
      .from("events")
      .insert({ store_id: storeId, title, description, event_date, event_time, location, status });
      
    if (error) return { error: "Erro ao criar evento." };
  }

  revalidatePath(`/lojas/${storeId}/eventos`);
  redirect(`/lojas/${storeId}/eventos`);
}

export async function deleteEvent(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = String(data.get("store_id") ?? "");
  const eventId = String(data.get("event_id") ?? "");

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("store_id", storeId);

  if (error) return { error: "Erro ao cancelar evento." };

  revalidatePath(`/lojas/${storeId}/eventos`);
  redirect(`/lojas/${storeId}/eventos`);
}

export async function uploadPhoto(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = String(data.get("store_id") ?? "");
  const eventId = String(data.get("event_id") ?? "");
  const file = data.get("file");

  if (!storeId || !eventId || !(file instanceof File)) {
    return { error: "Dados inválidos." };
  }

  // Validations
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Apenas imagens JPEG, PNG ou WEBP são permitidas." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Imagem excede o limite de 5MB." };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${storeId}/${eventId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("store_media")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload error", uploadError);
    return { error: "Falha ao enviar arquivo." };
  }

  const { error: dbError } = await supabase
    .from("event_photos")
    .insert({
      event_id: eventId,
      store_id: storeId,
      storage_path: filePath,
      uploaded_by: userData.user.id
    });

  if (dbError) {
    console.error("DB error", dbError);
    // Cleanup orphan file
    await supabase.storage.from("store_media").remove([filePath]);
    return { error: "Falha ao registrar foto." };
  }

  revalidatePath(`/lojas/${storeId}/eventos/${eventId}`);
  return { success: true };
}

export async function deletePhoto(data: FormData) {
  const supabase = await createClient();
  
  const storeId = String(data.get("store_id") ?? "");
  const eventId = String(data.get("event_id") ?? "");
  const photoId = String(data.get("photo_id") ?? "");
  const storagePath = String(data.get("storage_path") ?? "");

  // Tenta remover do storage primeiro
  await supabase.storage.from("store_media").remove([storagePath]);

  // Remove do BD
  const { error } = await supabase
    .from("event_photos")
    .delete()
    .eq("id", photoId)
    .eq("store_id", storeId);

  if (error) {
    return { error: "Falha ao excluir foto." };
  }

  revalidatePath(`/lojas/${storeId}/eventos/${eventId}`);
  return { success: true };
}
