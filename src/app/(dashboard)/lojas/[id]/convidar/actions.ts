"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function generateInvite(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { error: "Não autorizado." };
  }

  const storeId = data.get("store_id") as string;
  const role = data.get("role") as string;

  if (!storeId || !role) {
    return { error: "Dados inválidos." };
  }

  // Insert into store_invites
  const { data: invite, error } = await supabase
    .from("store_invites")
    .insert({
      store_id: storeId,
      role: role,
      created_by: userData.user.id
    })
    .select("token")
    .single();

  if (error || !invite) {
    console.error("Erro ao gerar convite:", error);
    return { error: "Não foi possível gerar o convite. Verifique suas permissões." };
  }

  // Determine base URL
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const inviteUrl = `${protocol}://${host}/invite/${invite.token}`;

  return { inviteUrl };
}
