"use server";

import { createClient } from "@/lib/supabase/server";

export async function registerPresence(challenge: string, method: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Não autenticado." };
  }

  const { data, error } = await supabase.rpc("register_presence_by_challenge", {
    p_challenge: challenge,
    p_method: method
  });

  if (error) {
    return { success: false, message: "Erro no banco de dados: " + error.message };
  }

  return { 
    success: data.success, 
    message: data.message 
  };
}
