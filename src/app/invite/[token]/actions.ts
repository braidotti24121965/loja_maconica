"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function setupPasswordAction(data: FormData) {
  const token = data.get("token") as string;
  const password = data.get("password") as string;
  
  if (!token || !password || password.length < 6) redirect("/");

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  // Define user password (updates the current authenticated user's password)
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    console.error("Erro ao definir senha:", updateError);
    redirect(`/invite/${token}?erro=falha_senha`);
  }
  
  // Accept the internal invite securely
  const { data: success, error: acceptError } = await supabase.rpc("accept_invite", { invite_token: token });

  if (acceptError || !success) {
    console.error("Erro ao aceitar convite:", acceptError);
    redirect("/lojas?erro_convite=invalido_ou_expirado");
  }

  redirect("/lojas");
}

export async function acceptInviteAction(data: FormData) {
  const token = data.get("token") as string;
  if (!token) redirect("/");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  const { data: success, error } = await supabase.rpc("accept_invite", { invite_token: token });

  if (error || !success) {
    console.error("Erro ao aceitar convite:", error);
    redirect("/lojas?erro_convite=invalido_ou_expirado");
  }

  redirect("/lojas");
}
