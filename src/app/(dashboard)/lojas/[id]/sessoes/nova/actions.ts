"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSession(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = data.get("store_id") as string;
  const date = data.get("date") as string;
  const sessionType = data.get("session_type") as string;
  const description = data.get("description") as string;

  if (!storeId || !date || !sessionType) return { error: "Dados obrigatórios faltando" };

  const { error } = await supabase
    .from("sessions")
    .insert({
      store_id: storeId,
      date,
      session_type: sessionType,
      description,
      created_by: userData.user.id
    });

  if (error) {
    console.error("Erro ao criar sessão:", error);
    return { error: "Falha ao registrar sessão. Verifique suas permissões." };
  }

  revalidatePath(`/lojas/${storeId}/sessoes`);
  redirect(`/lojas/${storeId}/sessoes`);
}
