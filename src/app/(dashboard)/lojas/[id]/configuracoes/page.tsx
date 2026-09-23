import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditStoreForm } from "./edit-store-form";

export default async function ConfigStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("*, store_memberships(role)")
    .eq("id", storeId)
    .single();

  const role = (store?.store_memberships as any)?.[0]?.role;

  if (!store || !["admin", "secretary"].includes(role)) {
    return (
      <div className="card">
        <h3>Acesso Negado</h3>
        <p className="subtle">Você precisa ser administrador para editar esta loja.</p>
        <Link href={`/lojas/${storeId}`} className="button" style={{ marginTop: 16, display: "inline-block" }}>Voltar</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para o Painel da Loja
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Configurações</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Altere os dados básicos da {store.name}.</p>
      
      <div className="card">
        <EditStoreForm store={store} />
      </div>
    </div>
  );
}
