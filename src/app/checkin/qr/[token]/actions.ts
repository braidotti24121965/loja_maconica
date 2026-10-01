"use server";
import { createClient } from "@/lib/supabase/server";

export async function confirmQrPresence(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { data, error } = await supabase.rpc("register_presence_qr", { p_qr_token: token });
  if (error) return { success: false, message: "Erro no servidor ao confirmar QR Code." };
  return data;
}
