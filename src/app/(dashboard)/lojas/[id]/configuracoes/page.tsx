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

  const role = (store?.store_memberships as { role?: string }[])?.[0]?.role;

  if (!store || !["admin", "secretary"].includes(role || "")) {
    redirect(`/lojas/${storeId}/meu-espaco`);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para o Painel da Loja
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Configurações</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Altere os dados básicos da {store.name}.</p>
      
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>Dados Básicos</h2>
        <EditStoreForm store={store} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 8 }}>Avançado</h2>
        <p className="subtle" style={{ marginBottom: 16 }}>Importe dados legados da loja via arquivos CSV (Excel).</p>
        <Link href={`/lojas/${storeId}/configuracoes/importar`} className="button" style={{ display: "inline-block", background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)" }}>
          Acessar Importação em Lote
        </Link>
        
      </div>
    </div>
  );
}
