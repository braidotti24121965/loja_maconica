"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORE_ROLES = ["admin", "secretary", "treasurer", "member", "viewer"] as const;
type StoreRole = (typeof STORE_ROLES)[number];

function allowedInviteRoles(actorRole: string): readonly StoreRole[] {
  return actorRole === "admin" ? STORE_ROLES : ["treasurer", "member", "viewer"];
}

export async function generateInvite(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { error: "Não autorizado." };
  }

  const storeId = String(data.get("store_id") ?? "");
  const role = String(data.get("role") ?? "");
  const email = String(data.get("email") ?? "").trim().toLowerCase();

  if (!UUID_PATTERN.test(storeId) || !EMAIL_PATTERN.test(email) || !STORE_ROLES.includes(role as StoreRole)) {
    return { error: "Dados inválidos. E-mail é obrigatório." };
  }

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership || !allowedInviteRoles(membership.role).includes(role as StoreRole)) {
    return { error: "Você não pode conceder esta função." };
  }

  // Insert into store_invites
  const { data: invite, error } = await supabase
    .from("store_invites")
    .insert({
      store_id: storeId,
      role: role,
      email: email,
      created_by: userData.user.id
    })
    .select("token")
    .single();

  if (error || !invite) {
    console.error("Erro ao gerar convite:", error);
    return { error: "Não foi possível gerar o convite. Verifique suas permissões." };
  }

  const headersList = await headers();
  const origin = headersList.get("origin");
  const fallbackHost = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const fallbackProtocol = fallbackHost.includes("localhost") ? "http" : "https";
  const inviteUrl = new URL(`/invite/${invite.token}`, origin || `${fallbackProtocol}://${fallbackHost}`).toString();

  return { inviteUrl };
}

export async function revokeInvite(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado." };

  const storeId = String(data.get("store_id") ?? "");
  const inviteId = String(data.get("invite_id") ?? "");

  if (!UUID_PATTERN.test(storeId) || !UUID_PATTERN.test(inviteId)) return { error: "Dados inválidos." };

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userData.user.id)
    .single();

  if (!membership) {
    return { error: "Sem permissão." };
  }

  const { data: invite } = await supabase
    .from("store_invites")
    .select("role")
    .eq("id", inviteId)
    .eq("store_id", storeId)
    .is("used_at", null)
    .is("revoked_at", null)
    .maybeSingle();

  if (!invite || !allowedInviteRoles(membership.role).includes(invite.role as StoreRole)) {
    return { error: "Convite não encontrado ou sem permissão." };
  }

  const { error } = await supabase
    .from("store_invites")
    .update({ revoked_at: new Date().toISOString(), revoked_by: userData.user.id })
    .eq("id", inviteId)
    .eq("store_id", storeId)
    .is("used_at", null)
    .is("revoked_at", null);

  if (error) {
    console.error("Erro ao revogar convite:", error);
    return { error: "Não foi possível revogar o convite." };
  }

  revalidatePath(`/lojas/${storeId}/convidar`);
  return { success: true };
}
