import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Link as LinkIcon } from "lucide-react";
import { InviteForm } from "./invite-form";

export default async function ConvidarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify if user is admin
  const { data: membership } = await supabase
    .from("store_memberships")
    .select("role, stores(name)")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "secretary"].includes(membership.role)) {
    return (
      <div className="card">
        <h3>Acesso Negado</h3>
        <p className="subtle">Você precisa ser administrador ou secretário desta loja para gerar convites.</p>
        <Link href="/lojas" className="button" style={{ marginTop: 16, display: "inline-block" }}>Voltar</Link>
      </div>
    );
  }

  const storeName = (membership.stores as any)?.name || "Loja";

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href="/lojas" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Lojas
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Gerar Convite</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Crie um link seguro para convidar um novo membro para a <strong>{storeName}</strong>.</p>
      
      <div className="card">
        <InviteForm storeId={storeId} />
      </div>
    </div>
  );
}
