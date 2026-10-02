"use server";

import { requireStoreAdmin } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CATEGORIES = new Set(["masonic_history", "store_anniversary", "commemorative", "other"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createEphemeris(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const category = String(data.get("category") ?? "other");

  let day = Number(data.get("day"));
  let month = Number(data.get("month"));
  let year: number | null = data.get("year") ? Number(data.get("year")) : null;

  const dateStr = data.get("date") ? String(data.get("date")).trim() : null;
  if (dateStr && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    }
  }

  if (!UUID_PATTERN.test(storeId)) return { error: "Dados inválidos." };
  if (!title || title.length < 2 || title.length > 150) return { error: "Título inválido." };
  if (isNaN(day) || day < 1 || day > 31 || isNaN(month) || month < 1 || month > 12) {
    return { error: "Data inválida." };
  }
  if (!CATEGORIES.has(category)) return { error: "Categoria inválida." };
  if (year !== null && (isNaN(year) || year < 1700 || year > 2100)) {
    return { error: "Ano inválido." };
  }

  let userId: string;
  try {
    const guard = await requireStoreAdmin(storeId);
    userId = guard.userId;
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();

  let existingQuery = supabase
    .from("ephemerides")
    .select("id")
    .eq("store_id", storeId)
    .ilike("title", title)
    .eq("day", day)
    .eq("month", month);

  if (year !== null) {
    existingQuery = existingQuery.eq("year", year);
  } else {
    existingQuery = existingQuery.is("year", null);
  }

  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) {
    return { error: "Já existe uma efeméride com este título e data para esta loja." };
  }

  const { error } = await supabase.from("ephemerides").insert({
    store_id: storeId,
    title,
    description: description || null,
    day,
    month,
    year,
    category,
    created_by: userId,
  });

  if (error) {
    console.error("Erro ao criar efeméride:", error);
    return { error: "Não foi possível cadastrar a efeméride." };
  }

  revalidatePath(`/lojas/${storeId}/efemerides`);
  revalidatePath(`/lojas/${storeId}/efemerides/relatorio`);
  revalidatePath(`/lojas/${storeId}`);
  return { success: true };
}

export async function updateEphemeris(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const ephemerisId = String(data.get("ephemeris_id") ?? "");
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const category = String(data.get("category") ?? "other");

  let day = Number(data.get("day"));
  let month = Number(data.get("month"));
  let year: number | null = data.get("year") ? Number(data.get("year")) : null;

  const dateStr = data.get("date") ? String(data.get("date")).trim() : null;
  if (dateStr && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    }
  }

  if (!UUID_PATTERN.test(storeId) || !UUID_PATTERN.test(ephemerisId)) return { error: "Dados inválidos." };
  if (!title || title.length < 2 || title.length > 150) return { error: "Título inválido." };
  if (isNaN(day) || day < 1 || day > 31 || isNaN(month) || month < 1 || month > 12) {
    return { error: "Data inválida." };
  }
  if (!CATEGORIES.has(category)) return { error: "Categoria inválida." };
  if (year !== null && (isNaN(year) || year < 1700 || year > 2100)) {
    return { error: "Ano inválido." };
  }

  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("ephemerides")
    .update({
      title,
      description: description || null,
      day,
      month,
      year,
      category,
    })
    .eq("id", ephemerisId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    console.error("Erro ao atualizar efeméride:", error);
    return { error: "Não foi possível atualizar a efeméride." };
  }

  revalidatePath(`/lojas/${storeId}/efemerides`);
  revalidatePath(`/lojas/${storeId}/efemerides/relatorio`);
  revalidatePath(`/lojas/${storeId}`);
  return { success: true };
}

export async function deleteEphemeris(data: FormData) {
  const storeId = String(data.get("store_id") ?? "");
  const ephemerisId = String(data.get("ephemeris_id") ?? "");

  if (!UUID_PATTERN.test(storeId) || !UUID_PATTERN.test(ephemerisId)) {
    return { error: "Dados inválidos." };
  }

  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("ephemerides")
    .delete()
    .eq("id", ephemerisId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    return { error: "Efeméride não encontrada ou sem permissão para excluir." };
  }

  revalidatePath(`/lojas/${storeId}/efemerides`);
  revalidatePath(`/lojas/${storeId}/efemerides/relatorio`);
  revalidatePath(`/lojas/${storeId}`);
  return { success: true };
}
