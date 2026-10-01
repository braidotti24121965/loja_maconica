import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ImportClient from "./import-client";

export const revalidate = 0;

export default async function ImportarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Authentication & Authorization
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "secretary", "treasurer"].includes(membership.role)) {
    redirect(`/lojas/${storeId}`);
  }

  return (
    <div>
      <Link href={`/lojas/${storeId}/configuracoes`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Configurações
      </Link>
      
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Importação em Lote</h1>
        <p className="subtle">Envie planilhas CSV para cadastrar múltiplos obreiros ou histórico financeiro de uma vez.</p>
      </div>

      <ImportClient storeId={storeId} />

    </div>
  );
}
