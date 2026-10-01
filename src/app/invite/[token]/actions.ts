"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

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
    redirect("/?erro_convite=invalido");
  }

  redirect("/lojas");
}

export async function setupPasswordAction(data: FormData) {
  const token = data.get("token") as string;
  const email = data.get("email") as string;
  const password = data.get("password") as string;
  
  if (!token || !email || !password) redirect("/");

  // Use service role to create the user directly (Admin API) to bypass email confirmation requirement if wanted,
  // Or simply use the regular supabase client if email confirmation is disabled.
  // Actually, standard `supabase.auth.signUp` logs the user in if email confirm is disabled.
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true // bypass email confirmation
  });

  const supabase = await createClient();
  if (!signUpError) {
    // After creating via Admin API, we must sign them in to establish the session
    await supabase.auth.signInWithPassword({ email, password });
  }

  if (signUpError) {
    console.error("Erro ao criar conta:", signUpError);
    redirect(`/invite/${token}?erro=falha_criacao`);
  }

  // Se precisar de auto-confirm (caso esteja habilitado no painel), usar o Admin API
  // Aqui assumimos que o Supabase está configurado sem confirmação obrigatória para esse MVP.
  // Depois de criado, o usuário já está logado na sessão do servidor.
  
  const { data: success, error } = await supabase.rpc("accept_invite", { invite_token: token });

  if (error || !success) {
    console.error("Erro ao aceitar convite após criar conta:", error);
    redirect("/?erro_convite=invalido_apos_criacao");
  }

  redirect("/lojas");
}
