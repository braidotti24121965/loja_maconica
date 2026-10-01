"use server";

import { requireStoreAdmin } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateBrother(data: FormData) {
  const storeId = data.get("store_id") as string;
  const brotherId = data.get("brother_id") as string;
  const fullName = data.get("full_name") as string;
  const cim = data.get("cim") as string;
  const degree = data.get("degree") as string;
  const phone = data.get("phone") as string;
  const office = data.get("office") as string;

  if (!storeId || !brotherId || !fullName || !degree)
    return { error: "Dados obrigatórios faltando" };

  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("brothers")
    .update({
      full_name: fullName,
      cim: cim || null,
      degree,
      phone: phone || null,
      office: office || null,
    })
    .eq("id", brotherId)
    .eq("store_id", storeId);

  if (error) {
    console.error("Erro ao atualizar obreiro:", error);
    return { error: "Falha ao atualizar irmão. Verifique suas permissões." };
  }

  revalidatePath(`/lojas/${storeId}/membros`);
  redirect(`/lojas/${storeId}/membros`);
}

export async function deleteBrother(data: FormData) {
  const storeId = data.get("store_id") as string;
  const brotherId = data.get("brother_id") as string;

  if (!storeId || !brotherId) return { error: "Dados inválidos" };

  try {
    await requireStoreAdmin(storeId);
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("brothers")
    .delete()
    .eq("id", brotherId)
    .eq("store_id", storeId);

  if (error) {
    console.error("Erro ao excluir obreiro:", error);
    return { error: "Falha ao excluir irmão. Verifique suas permissões." };
  }

  revalidatePath(`/lojas/${storeId}/membros`);
  redirect(`/lojas/${storeId}/membros`);
}

export async function addDependent(formData: FormData) {
  const brotherId = formData.get("brother_id") as string;
  const storeId = formData.get("store_id") as string;
  const name = formData.get("name") as string;
  const relationship = formData.get("relationship") as string;
  const birthdateStr = formData.get("birthdate") as string;
  const birthdate = birthdateStr || null;

  if (!name || !relationship) throw new Error("Nome e parentesco são obrigatórios");
  if (!storeId) throw new Error("Não autorizado");

  try {
    await requireStoreAdmin(storeId);
  } catch {
    throw new Error("Não autorizado");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("dependents")
    .insert({ brother_id: brotherId, name, relationship, birthdate });

  if (error) {
    console.error("Erro ao adicionar dependente:", error);
    throw new Error("Não foi possível adicionar o dependente.");
  }

  revalidatePath(`/lojas/${storeId}/membros/${brotherId}`);
}

export async function deleteDependent(formData: FormData) {
  const id = formData.get("id") as string;
  const storeId = formData.get("store_id") as string;
  const brotherId = formData.get("brother_id") as string;

  if (!storeId) throw new Error("Não autorizado");

  try {
    await requireStoreAdmin(storeId);
  } catch {
    throw new Error("Não autorizado");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("dependents")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir dependente:", error);
    throw new Error("Não foi possível excluir o dependente.");
  }

  if (storeId && brotherId) {
    revalidatePath(`/lojas/${storeId}/membros/${brotherId}`);
  }
}

export async function editDependent(formData: FormData) {
  const id = formData.get("id") as string;
  const storeId = formData.get("store_id") as string;
  const brotherId = formData.get("brother_id") as string;
  const name = formData.get("name") as string;
  const relationship = formData.get("relationship") as string;
  const birthdateStr = formData.get("birthdate") as string;
  const birthdate = birthdateStr || null;

  if (!name || !relationship || !id) throw new Error("Dados obrigatórios faltando");
  if (!storeId) throw new Error("Não autorizado");

  try {
    await requireStoreAdmin(storeId);
  } catch {
    throw new Error("Não autorizado");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("dependents")
    .update({ name, relationship, birthdate })
    .eq("id", id);

  if (error) {
    console.error("Erro ao editar dependente:", error);
    throw new Error("Não foi possível editar o dependente.");
  }

  if (storeId && brotherId) {
    revalidatePath(`/lojas/${storeId}/membros/${brotherId}`);
  }
}

// linkOwnUserToBrother: autovinculação — não exige papel admin, apenas autenticação
export async function linkOwnUserToBrother(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = data.get("store_id") as string;
  const brotherId = data.get("brother_id") as string;

  if (!storeId || !brotherId) return { error: "Dados obrigatórios faltando" };

  const { error } = await supabase
    .from("brothers")
    .update({ user_id: userData.user.id })
    .eq("id", brotherId)
    .eq("store_id", storeId);

  if (error) {
    console.error("Erro ao vincular usuário:", error);
    return { error: "Falha ao vincular usuário. Verifique suas permissões." };
  }

  revalidatePath(`/lojas/${storeId}/membros/${brotherId}`);
  revalidatePath(`/lojas/${storeId}`);
  redirect(`/lojas/${storeId}`);
}
