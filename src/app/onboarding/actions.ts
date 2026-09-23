"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitOnboarding(data: FormData) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect("/login");
  }

  const fullName = data.get("full_name") as string;
  if (!fullName || fullName.length < 2) {
    return { error: "Nome muito curto." };
  }

  // Insert profile
  const { error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userData.user.id,
      full_name: fullName,
    });

  if (insertError) {
    console.error("Erro ao criar perfil:", insertError);
    return { error: "Não foi possível salvar o perfil. Tente novamente." };
  }

  // Redirect to dashboard
  redirect("/");
}
