"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { error: "Não autorizado." };
  }

  const fullName = data.get("full_name") as string;
  if (!fullName || fullName.length < 2) {
    return { error: "Nome muito curto." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userData.user.id);

  if (error) {
    console.error("Erro ao atualizar perfil:", error);
    return { error: "Erro ao atualizar perfil." };
  }

  revalidatePath("/", "layout"); // Revalidate layout to update avatar
  return { success: true };
}
