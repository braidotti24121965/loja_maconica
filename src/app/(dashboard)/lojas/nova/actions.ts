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
    return {
      error: "Apenas o admin da plataforma pode criar lojas.",
    };
  }

  const name = String(data.get("name") ?? "").trim();
  const number = String(data.get("number") ?? "").trim();
  const city = String(data.get("city") ?? "").trim();
  const state = String(data.get("state") ?? "").trim();
  let tenantId = String(data.get("tenant_id") ?? "").trim();

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  if (!tenantId || tenantId === "new") {
    const baseSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const slug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`;

    const { data: newTenantId, error: tenantError } =
      await supabase.rpc("create_tenant", {
        new_name: name,
        new_slug: slug,
      });

    if (tenantError || !newTenantId) {
      console.error("Erro ao criar Tenant:", tenantError);
      return { error: "Erro ao criar Tenant." };
    }

    tenantId = newTenantId;
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      tenant_id: tenantId,
      name,
      number,
      city,
      state: state ? state.toUpperCase() : null,
      active: true,
    })
    .select("id")
    .single();

  if (storeError || !store) {
    console.error("Erro ao criar loja:", storeError);
    return {
      error: "Erro ao criar loja. O nome pode já existir nesta organização.",
    };
  }

  const { error: membershipError } = await supabase.rpc(
    "provision_store_admin",
    {
      p_store_id: store.id,
      p_user_id: userData.user.id,
    }
  );

  if (membershipError) {
    console.error(
      "Erro ao vincular administrador à loja:",
      membershipError
    );

    return {
      error: "Loja criada, mas não foi possível vincular o administrador.",
    };
  }

  revalidatePath("/admin");
  redirect("/admin");
}
