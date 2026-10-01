"use server";

import { requireStoreAdmin } from "@/lib/auth/require-store-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBrother(data: FormData) {
  const storeId = data.get("store_id") as string;
  const fullName = data.get("full_name") as string;
  const cim = data.get("cim") as string;
  const degree = data.get("degree") as string;
  const phone = data.get("phone") as string;
  const office = data.get("office") as string;

  if (!storeId || !fullName || !degree) return { error: "Dados obrigatórios faltando" };

  let userId: string;
  try {
    const guard = await requireStoreAdmin(storeId);
    userId = guard.userId;
  } catch {
    return { error: "Não autorizado" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("brothers")
    .insert({
      store_id: storeId,
      full_name: fullName,
      cim: cim || null,
      degree,
      phone: phone || null,
      office: office || null,
      created_by: userId,
    });

  if (error) {
    console.error("Erro ao cadastrar obreiro:", error);
    return { error: "Falha ao registrar irmão. Verifique suas permissões." };
  }

  revalidatePath(`/lojas/${storeId}/membros`);
  redirect(`/lojas/${storeId}/membros`);
}
