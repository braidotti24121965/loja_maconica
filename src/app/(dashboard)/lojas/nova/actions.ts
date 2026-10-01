"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStore(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { error: "Não autorizado." };
  }

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) {
    return { error: "Apenas o admin da plataforma pode criar lojas." };
  }

  const name = data.get("name") as string;
  const number = data.get("number") as string;
  const city = data.get("city") as string;
  const state = data.get("state") as string;
  let tenant_id = data.get("tenant_id") as string;

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  if (!tenant_id || tenant_id === "new") {
    // Cria um novo tenant para esta loja
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const { data: newTenant, error: tenantErr } = await supabase
      .from("tenants")
      .insert({ name: name, slug })
      .select("id")
      .single();
    
    if (tenantErr || !newTenant) {
      return { error: "Erro ao criar Tenant." };
    }
    tenant_id = newTenant.id;
  }

  // 1. Create the store
  const { data: store, error } = await supabase
    .from("stores")
    .insert({
      tenant_id,
      name,
      number,
      city,
      state: state ? state.toUpperCase() : null,
      active: true
    })
    .select("id")
    .single();

  if (error || !store) {
    console.error("Erro ao criar loja:", error);
    return { error: "Erro ao criar loja. O nome pode já existir nesta organização." };
  }

  // Não inserimos o platform admin no store_memberships
  // O SaaS Owner provisiona a loja e envia o primeiro convite interno ou adiciona o owner via banco.
  // Em uma fase futura, a tela de admin terá uma forma de gerar um convite master para o Tenant.

  revalidatePath("/admin");
  redirect("/admin");
}
