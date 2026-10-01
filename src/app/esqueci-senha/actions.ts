"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function requestPasswordReset(data: FormData) {
  const email = (data.get("email") as string)?.trim();

  if (!email) {
    return { error: "Por favor, informe o seu e-mail." };
  }

  try {
    const headersList = await headers();
    const origin = headersList.get("origin") || headersList.get("referer")?.split("/esqueci")[0] || "";

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?type=recovery&next=/redefinir-senha`,
    });

    if (error) {
      console.error("Erro ao solicitar redefinição de senha:", error);
    }

    // Retorna mensagem de sucesso amigável (sem expor se o e-mail existe por privacidade)
    return {
      success: "Se este e-mail estiver cadastrado no sistema, enviamos uma mensagem com as instruções para redefinir sua senha. Verifique sua caixa de entrada e spam.",
    };
  } catch (err) {
    console.error("Exceção ao solicitar redefinição de senha:", err);
    return { error: "Não foi possível enviar o e-mail no momento. Tente novamente mais tarde." };
  }
}
