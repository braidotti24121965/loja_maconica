"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setActiveStore(storeId: string) {
  const cookieStore = await cookies();
  if (!storeId) {
    cookieStore.delete("active_store_id");
  } else {
    cookieStore.set("active_store_id", storeId, { path: "/", maxAge: 60 * 60 * 24 * 30 }); // 30 days
  }
  revalidatePath("/", "layout");
}

export async function getActiveStore() {
  const cookieStore = await cookies();
  return cookieStore.get("active_store_id")?.value || null;
}
