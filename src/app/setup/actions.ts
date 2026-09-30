"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function generateSlug(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export async function setupFirstTenant(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) redirect("/login");

  const name = data.get("tenant_name") as string;
  if (!name) throw new Error("Nome inválido");

  const slug = generateSlug(name) + "-" + Math.floor(Math.random() * 1000);

  // Criar Tenant e Membership via RPC (bypassa RLS de inserção primária)
  const { data: tenantId, error: rpcError } = await supabase
    .rpc("create_tenant", {
      new_name: name,
      new_slug: slug
    });

  if (rpcError || !tenantId) {
    console.error(rpcError);
    throw new Error("Erro ao criar organização");
  }

  redirect("/");
}
