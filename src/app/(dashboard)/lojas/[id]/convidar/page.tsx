import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InviteForm } from "./invite-form";
import { RevokeButton } from "./revoke-button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function ConvidarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ email?: string }> }) {
  const { id: storeId } = await params;
  const search = await searchParams;
  const initialEmail = search?.email;
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

  const storeName = (membership.stores as { name?: string })?.name || "Loja";

  // O token nunca é retornado nesta listagem administrativa.
  const { data: invites } = await supabase
    .from("store_invites")
    .select("id, email, role, expires_at, created_at, used_at, revoked_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Loja
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Gerar Convite</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Crie um link seguro para convidar um novo membro para a <strong>{storeName}</strong>.</p>
      
      <div className="card" style={{ marginBottom: 32 }}>
        <InviteForm storeId={storeId} actorRole={membership.role} initialEmail={initialEmail} />
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Histórico de Convites</h2>
      {invites && invites.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {invites.map((inv) => {
            const status = inv.used_at
              ? "Utilizado"
              : inv.revoked_at
                ? "Revogado"
                : new Date(inv.expires_at) <= new Date()
                  ? "Expirado"
                  : "Pendente";

            return (
              <div key={inv.id} className="card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ display: "block", marginBottom: 4 }}>{inv.email || "Convite legado sem e-mail"}</strong>
                  <div style={{ fontSize: 13, display: "flex", gap: 12, color: "var(--subtle)" }}>
                    <span className="badge">{inv.role}</span>
                    <span>{status}</span>
                    <span>Expira em: {format(new Date(inv.expires_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
                {status === "Pendente" && <RevokeButton storeId={storeId} inviteId={inv.id} />}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="subtle" style={{ fontSize: 14 }}>Nenhum convite foi criado para esta loja.</p>
      )}
    </div>
  );
}
