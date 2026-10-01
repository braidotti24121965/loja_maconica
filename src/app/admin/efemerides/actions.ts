"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CATEGORIES = new Set(["masonic_history", "store_anniversary", "commemorative", "other"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function checkSaaSAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado.");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) throw new Error("Acesso negado ao Dono da Plataforma.");

  return { supabase, userId: user.id };
}

export async function createGlobalEphemeris(data: FormData) {
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const day = Number(data.get("day"));
  const month = Number(data.get("month"));
  const yearStr = data.get("year") ? String(data.get("year")) : null;
  const category = String(data.get("category") ?? "masonic_history");

  if (!title || title.length < 2 || title.length > 150) return { error: "Título inválido." };
  if (isNaN(day) || day < 1 || day > 31 || isNaN(month) || month < 1 || month > 12) {
    return { error: "Dia ou mês inválido." };
  }
  if (!CATEGORIES.has(category)) return { error: "Categoria inválida." };

  const year = yearStr ? Number(yearStr) : null;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    const auth = await checkSaaSAdmin();
    supabase = auth.supabase;
    userId = auth.userId;
  } catch {
    return { error: "Não autorizado." };
  }

  const { error } = await supabase.from("ephemerides").insert({
    store_id: null, // Global
    title,
    description: description || null,
    day,
    month,
    year,
    category,
    created_by: userId,
  });

  if (error) {
    console.error("Erro ao criar efeméride global:", error);
    return { error: "Não foi possível criar a efeméride global." };
  }

  revalidatePath("/admin/efemerides");
  return { success: true };
}

export async function deleteGlobalEphemeris(data: FormData) {
  const ephemerisId = String(data.get("ephemeris_id") ?? "");
  if (!UUID_PATTERN.test(ephemerisId)) return { error: "Dados inválidos." };

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    const auth = await checkSaaSAdmin();
    supabase = auth.supabase;
  } catch {
    return { error: "Não autorizado." };
  }

  const { data: deleted, error } = await supabase
    .from("ephemerides")
    .delete()
    .eq("id", ephemerisId)
    .is("store_id", null)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    return { error: "Efeméride global não encontrada." };
  }

  revalidatePath("/admin/efemerides");
  return { success: true };
}
