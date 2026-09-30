"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EVENT_STATUSES = new Set(["draft", "published", "cancelled", "archived"]);
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function getEventAdmin(storeId: string, eventId?: string) {
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
    return { error: "Você não tem permissão para gerenciar eventos." } as const;
  }

  if (eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!event) return { error: "Evento não encontrado nesta loja." } as const;
  }

  return { supabase, user } as const;
}

export async function saveEvent(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const eventId = data.get("event_id") ? String(data.get("event_id")) : null;
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const eventDate = String(data.get("event_date") ?? "");
  const eventTime = String(data.get("event_time") ?? "").trim() || null;
  const location = String(data.get("location") ?? "").trim();
  const status = String(data.get("status") ?? "draft");

  if (!UUID_PATTERN.test(storeId) || (eventId && !UUID_PATTERN.test(eventId))) {
    return { error: "Identificação do evento inválida." };
  }
  if (title.length < 2 || title.length > 160 || !DATE_PATTERN.test(eventDate)) {
    return { error: "Informe título e data válidos." };
  }
  if ((eventTime && !TIME_PATTERN.test(eventTime)) || !EVENT_STATUSES.has(status)) {
    return { error: "Horário ou status inválido." };
  }
  if (description.length > 5000 || location.length > 240) {
    return { error: "Descrição ou local excede o tamanho permitido." };
  }

  const access = await getEventAdmin(storeId, eventId ?? undefined);
  if ("error" in access) return access;

  const payload = {
    title,
    description: description || null,
    event_date: eventDate,
    event_time: eventTime,
    location: location || null,
    status,
  };

  const result = eventId
    ? await access.supabase.from("events").update(payload).eq("id", eventId).eq("store_id", storeId)
    : await access.supabase.from("events").insert({
        ...payload,
        store_id: storeId,
        created_by: access.user.id,
      });

  if (result.error) return { error: eventId ? "Erro ao atualizar evento." : "Erro ao criar evento." };

  revalidatePath(`/lojas/${storeId}/eventos`);
  redirect(`/lojas/${storeId}/eventos`);
}

export async function deleteEvent(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const eventId = String(data.get("event_id") ?? "");
  if (!UUID_PATTERN.test(storeId) || !UUID_PATTERN.test(eventId)) return { error: "Dados inválidos." };

  const access = await getEventAdmin(storeId, eventId);
  if ("error" in access) return access;

  const { error } = await access.supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", eventId)
    .eq("store_id", storeId);

  if (error) return { error: "Erro ao arquivar evento." };
  revalidatePath(`/lojas/${storeId}/eventos`);
  redirect(`/lojas/${storeId}/eventos`);
}

export async function uploadPhoto(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const eventId = String(data.get("event_id") ?? "");
  const file = data.get("file");

  if (!UUID_PATTERN.test(storeId) || !UUID_PATTERN.test(eventId) || !(file instanceof File)) {
    return { error: "Dados inválidos." };
  }
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension || file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return { error: "Use uma imagem JPEG, PNG ou WEBP de até 5 MB." };
  }

  const access = await getEventAdmin(storeId, eventId);
  if ("error" in access) return access;

  const { count } = await access.supabase
    .from("event_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("store_id", storeId);
  if ((count ?? 0) >= 20) return { error: "Este evento já possui o limite de 20 fotos." };

  const filePath = `${storeId}/${eventId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await access.supabase.storage
    .from("store_media")
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "Falha ao enviar arquivo." };

  const { error: dbError } = await access.supabase.from("event_photos").insert({
    event_id: eventId,
    store_id: storeId,
    storage_path: filePath,
    uploaded_by: access.user.id,
  });

  if (dbError) {
    await access.supabase.storage.from("store_media").remove([filePath]);
    return { error: dbError.message.includes("photo limit") ? "Limite de 20 fotos atingido." : "Falha ao registrar foto." };
  }

  revalidatePath(`/lojas/${storeId}/eventos/${eventId}`);
  return { success: true };
}

export async function deletePhoto(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const eventId = String(data.get("event_id") ?? "");
  const photoId = String(data.get("photo_id") ?? "");
  if (![storeId, eventId, photoId].every((value) => UUID_PATTERN.test(value))) {
    return { error: "Dados inválidos." };
  }

  const access = await getEventAdmin(storeId, eventId);
  if ("error" in access) return access;

  const { data: deletedPhoto, error: deleteError } = await access.supabase
    .from("event_photos")
    .delete()
    .eq("id", photoId)
    .eq("event_id", eventId)
    .eq("store_id", storeId)
    .select("id, event_id, store_id, storage_path, is_cover, order_index, uploaded_by, created_at")
    .maybeSingle();

  if (deleteError || !deletedPhoto) return { error: "Foto não encontrada ou sem permissão." };

  const { error: storageError } = await access.supabase.storage
    .from("store_media")
    .remove([deletedPhoto.storage_path]);

  if (storageError) {
    await access.supabase.from("event_photos").insert(deletedPhoto);
    return { error: "Não foi possível excluir o arquivo. O registro foi restaurado." };
  }

  revalidatePath(`/lojas/${storeId}/eventos/${eventId}`);
  return { success: true };
}

export async function setCoverPhoto(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const eventId = String(data.get("event_id") ?? "");
  const photoId = String(data.get("photo_id") ?? "");
  if (![storeId, eventId, photoId].every((value) => UUID_PATTERN.test(value))) {
    return { error: "Dados inválidos." };
  }

  const access = await getEventAdmin(storeId, eventId);
  if ("error" in access) return access;

  const { data: target } = await access.supabase
    .from("event_photos")
    .select("id")
    .eq("id", photoId)
    .eq("event_id", eventId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!target) return { error: "Foto não encontrada." };

  const { error: unsetError } = await access.supabase
    .from("event_photos")
    .update({ is_cover: false })
    .eq("event_id", eventId)
    .eq("store_id", storeId)
    .eq("is_cover", true);
  if (unsetError) return { error: "Não foi possível alterar a capa." };

  const { error: setError } = await access.supabase
    .from("event_photos")
    .update({ is_cover: true })
    .eq("id", photoId)
    .eq("event_id", eventId)
    .eq("store_id", storeId);
  if (setError) return { error: "Não foi possível definir a capa." };

  revalidatePath(`/lojas/${storeId}/eventos/${eventId}`);
  return { success: true };
}
