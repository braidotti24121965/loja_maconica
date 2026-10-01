"use server";

import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function revokeAndGenerateDigitalCard(storeId: string, brotherId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  // Check if user is linked to this brother OR is admin
  const { data: brother } = await supabase
    .from("brothers")
    .select("user_id")
    .eq("id", brotherId)
    .eq("store_id", storeId)
    .single();

  if (!brother) throw new Error("Membro não encontrado.");

  let isAuthorized = false;
  if (brother.user_id === user.id) {
    isAuthorized = true;
  } else {
    const { data: membership } = await supabase
      .from("store_memberships")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", user.id)
      .single();
    if (membership && ["admin", "secretary"].includes(membership.role)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) throw new Error("Acesso negado.");

  // Revoke all existing cards for this brother
  await supabase
    .from("digital_cards")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("brother_id", brotherId)
    .eq("store_id", storeId)
    .eq("status", "active");

  // Generate new token
  const token = crypto.randomBytes(32).toString("hex");

  const { error } = await supabase
    .from("digital_cards")
    .insert({
      store_id: storeId,
      brother_id: brotherId,
      token: token,
      status: "active"
    });

  if (error) throw new Error("Erro ao gerar nova carteirinha: " + error.message);

  revalidatePath(`/lojas/${storeId}/meu-espaco`);
  return { success: true, token };
}
