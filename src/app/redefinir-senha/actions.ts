"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePassword(data: FormData) {
  const password = data.get("password") as string;
  const confirmPassword = data.get("confirm_password") as string;

  if (!password || !confirmPassword) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  if (password.length < 6) {
    return { error: "A nova senha deve ter no mínimo 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "A confirmação de senha não confere." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada ou inválida. Solicite um novo link de redefinição de senha." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Erro ao redefinir senha:", error);
    return { error: "Não foi possível atualizar sua senha. Tente novamente." };
  }

  revalidatePath("/", "layout");
  redirect("/lojas");
}
