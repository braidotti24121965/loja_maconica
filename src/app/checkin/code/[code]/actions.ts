"use server";
import { createClient } from "@/lib/supabase/server";

export async function confirmCodePresence(code: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { data, error } = await supabase.rpc("register_presence_short", { p_short_code: code });
  if (error) return { success: false, message: "Erro no servidor ao validar código." };
  return data;
}
