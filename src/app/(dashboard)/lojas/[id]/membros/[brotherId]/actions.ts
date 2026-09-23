"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateBrother(data: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = data.get("store_id") as string;
  const brotherId = data.get("brother_id") as string;
  
  const fullName = data.get("full_name") as string;
  const cim = data.get("cim") as string;
  const degree = data.get("degree") as string;
  const phone = data.get("phone") as string;
  const office = data.get("office") as string;

  if (!storeId || !brotherId || !fullName || !degree) return { error: "Dados obrigatórios faltando" };

  const { error } = await supabase
    .from("brothers")
    .update({
      full_name: fullName,
      cim: cim || null,
      degree,
      phone: phone || null,
      office: office || null
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
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return { error: "Não autorizado" };

  const storeId = data.get("store_id") as string;
  const brotherId = data.get("brother_id") as string;

  if (!storeId || !brotherId) return { error: "Dados inválidos" };

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
  const supabase = await createClient();
  const brotherId = formData.get("brother_id") as string;
  const name = formData.get("name") as string;
  const relationship = formData.get("relationship") as string;
  const birthdateStr = formData.get("birthdate") as string;
  
  const birthdate = birthdateStr ? birthdateStr : null;

  if (!name || !relationship) {
    throw new Error("Nome e parentesco são obrigatórios");
  }

  const { error } = await supabase
    .from("dependents")
    .insert({
      brother_id: brotherId,
      name,
      relationship,
      birthdate
    });

  if (error) {
    console.error("Erro ao adicionar dependente:", error);
    throw new Error("Não foi possível adicionar o dependente.");
  }
}

export async function deleteDependent(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  
  const { error } = await supabase
    .from("dependents")
    .delete()
    .eq("id", id);
    
  if (error) {
    console.error("Erro ao excluir dependente:", error);
    throw new Error("Não foi possível excluir o dependente.");
  }
}
