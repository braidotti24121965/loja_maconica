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

  const name = data.get("name") as string;
  const number = data.get("number") as string;
  const city = data.get("city") as string;
  const state = data.get("state") as string;
  const tenant_id = data.get("tenant_id") as string;

  if (!name || !tenant_id) {
    return { error: "Nome e Organização são obrigatórios." };
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

  // 2. Add the creator as store Admin automatically
  const { error: memberError } = await supabase
    .from("store_memberships")
    .insert({
      store_id: store.id,
      user_id: userData.user.id,
      role: "admin"
    });

  if (memberError) {
    console.error("Erro ao vincular membro:", memberError);
    // Ignore error for now, as store was created, but log it
  }

  revalidatePath("/lojas");
  redirect("/lojas");
}
