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

  // Criar Tenant
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name, slug })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    console.error(tenantError);
    throw new Error("Erro ao criar organização");
  }

  // Vincular Usuário como Owner
  await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: tenant.id,
      user_id: userData.user.id,
      role: "owner"
    });

  redirect("/");
}
