import { createClient } from "@/lib/supabase/server";
import { Store as StoreIcon, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LojasPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const erroConvite = params.erro_convite;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // If there is no session, redirect instead of throwing
  if (userError && userError.message === "Auth session missing!") {
    redirect("/login");
  }

  if (userError) throw new Error("Auth Error: " + userError.message);
  if (!user) redirect("/login");

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, city, state, active, store_memberships(role)");

  if (storesError) throw new Error("Stores Error: " + storesError.message);

  const { data: tenantMemberships, error: tenantError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"]);

  if (tenantError) throw new Error("Tenant Error: " + tenantError.message);

  const canCreate = tenantMemberships && tenantMemberships.length > 0;

  return (
    <div>
      {erroConvite && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "16px 24px", borderRadius: 8, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 20 }}>⚠️</div>
          <div>
            <strong style={{ display: "block", marginBottom: 4 }}>Erro no Convite</strong>
            <span style={{ fontSize: 14 }}>O convite acessado é inválido, já foi utilizado ou expirou. Solicite um novo convite à Loja.</span>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Minhas Lojas</h1>
          <p className="subtle">Lojas nas quais você possui vínculo.</p>
        </div>
        {canCreate && (
          <Link href="/lojas/nova" className="button">
            <Plus size={16} style={{ marginRight: 8 }} />
            Nova Loja
          </Link>
        )}
      </div>

      {stores && stores.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 24, marginTop: 16 }}>
          {stores.map((store) => {
            const roles = store.store_memberships as { role?: string }[] | undefined;
            const role = roles?.[0]?.role || "Membro";
            return (
              <article className="card" key={store.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div className="icon"><StoreIcon size={20} /></div>
                  <div>
                    <h3 style={{ fontSize: 16 }}>{store.name}</h3>
                    <div className="subtle" style={{ fontSize: 13 }}>
                      {store.city} {store.state ? `- ${store.state}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="badge">{role}</span>
                    <Link href={`/lojas/${store.id}`} className="subtle" style={{ fontSize: 13, textDecoration: "underline", color: "var(--brand)" }}>Gerenciar Loja</Link>
                    {["admin", "secretary"].includes(role) && (
                      <Link href={`/lojas/${store.id}/convidar`} className="subtle" style={{ fontSize: 13, textDecoration: "underline" }}>Gerar Convite</Link>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: store.active ? "var(--green-dark)" : "var(--subtle)" }}>
                    {store.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <StoreIcon size={32} style={{ margin: "0 auto 16px", color: "var(--subtle)" }} />
          <h3>Nenhuma loja encontrada</h3>
          <p className="subtle" style={{ marginTop: 8 }}>Você ainda não possui vínculo com nenhuma loja.</p>
        </div>
      )}
    </div>
  );
}
