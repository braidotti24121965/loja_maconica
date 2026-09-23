"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function acceptInviteAction(data: FormData) {
  const token = data.get("token") as string;
  if (!token) redirect("/");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  // Call the secure RPC function to accept the invite
  const { data: success, error } = await supabase.rpc("accept_invite", { invite_token: token });

  if (error || !success) {
    console.error("Erro ao aceitar convite:", error);
    // Usually we would show an error, but let's just redirect to dashboard for simplicity in this MVP
    redirect("/?erro_convite=invalido");
  }

  redirect("/lojas");
}
