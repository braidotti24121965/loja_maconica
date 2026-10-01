"use server";

import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function revokeAndGenerateDigitalCard(storeId: string, brotherId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  // Generate new high entropy token
  const token = crypto.randomBytes(32).toString("hex");

  const { error } = await supabase.rpc("revoke_and_generate_card", {
    p_store_id: storeId,
    p_brother_id: brotherId,
    p_token: token
  });

  if (error) throw new Error("Erro ao gerar nova carteirinha: " + error.message);

  revalidatePath(`/lojas/${storeId}/meu-espaco`);
  return { success: true, token };
}
