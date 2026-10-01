"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function generateDigitalCard(storeId: string, brotherId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const { data, error } = await supabase.rpc("generate_digital_card", {
    p_store_id: storeId,
    p_brother_id: brotherId
  });

  if (error) throw new Error("Erro ao gerar nova carteirinha: " + error.message);

  revalidatePath(`/lojas/${storeId}/meu-espaco`);
  return { success: true, token: data };
}

export async function revokeDigitalCard(storeId: string, brotherId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.rpc("revoke_digital_card", {
    p_store_id: storeId,
    p_brother_id: brotherId
  });

  if (error) throw new Error("Erro ao revogar carteirinha: " + error.message);

  revalidatePath(`/lojas/${storeId}/meu-espaco`);
  return { success: true };
}
