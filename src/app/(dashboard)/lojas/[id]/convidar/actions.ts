"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORE_ROLES = ["admin", "secretary", "treasurer", "member", "viewer"] as const;
type StoreRole = (typeof STORE_ROLES)[number];

function allowedInviteRoles(actorRole: string): readonly StoreRole[] {
  return actorRole === "admin" ? STORE_ROLES : ["treasurer", "member", "viewer"];
}

function getApplicationUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return configuredUrl;
  return "https://maconaria360.com.br";
}

async function revokeFailedInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inviteId: string,
  storeId: string,
  userId: string
) {
  const { error } = await supabase
    .from("store_invites")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: userId,
    })
    .eq("id", inviteId)
    .eq("store_id", storeId)
    .is("used_at", null)
    .is("revoked_at", null);

  if (error) {
    console.error("[invites] Falha ao revogar convite incompleto", {
      inviteId,
      storeId,
      error: error.message,
    });
  }
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

  if (
    !membership ||
    !["admin", "secretary"].includes(membership.role) ||
    !allowedInviteRoles(membership.role).includes(role as StoreRole)
  ) {
    return { error: "Você não pode conceder esta função." };
  }

  // Insert into internal store_invites first to get the token
  const { data: invite, error } = await supabase
    .from("store_invites")
    .insert({
      store_id: storeId,
      role: role,
      email: email,
      created_by: userData.user.id
    })
    .select("id, token")
    .single();

  if (error || !invite) {
    console.error("Erro ao gerar convite interno:", error);
    return { error: "Não foi possível gerar o convite interno." };
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = getApplicationUrl();

  if (!secretKey) {
    await revokeFailedInvite(supabase, invite.id, storeId, userData.user.id);
    console.error("[invites] SUPABASE_SECRET_KEY ausente no ambiente do servidor");
    return { error: "A chave de envio de convites não está disponível neste ambiente." };
  }

  let redirectTo: string;
  try {
    redirectTo = new URL(
      `/auth/callback?next=/invite/${invite.token}`,
      appUrl
    ).toString();
  } catch {
    await revokeFailedInvite(supabase, invite.id, storeId, userData.user.id);
    console.error("[invites] URL pública inválida", { appUrl });
    return { error: "A URL pública do sistema está configurada incorretamente." };
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Send official Supabase Invite
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo
  });

  if (inviteError) {
    await revokeFailedInvite(supabase, invite.id, storeId, userData.user.id);
    console.error("[invites] Supabase Auth recusou o envio", {
      status: inviteError.status,
      code: inviteError.code,
      message: inviteError.message,
    });
    return { error: "Não foi possível enviar o convite pelo Supabase. O usuário pode já possuir conta ou o limite de envios foi atingido." };
  }

  revalidatePath(`/lojas/${storeId}/convidar`);
  return { success: "E-mail de convite enviado com sucesso." };
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
