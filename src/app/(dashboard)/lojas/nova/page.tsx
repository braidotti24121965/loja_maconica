import { createClient } from "@/lib/supabase/server";
import { StoreForm } from "./store-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NovaLojaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: tenantMemberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(name)")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"]);

  if (!tenantMemberships || tenantMemberships.length === 0) {
    return (
      <div className="card">
        <h3>Acesso Negado</h3>
        <p className="subtle">Você precisa ser administrador de uma Organização (Tenant) para criar lojas.</p>
        <Link href="/lojas" className="button" style={{ marginTop: 16, display: "inline-block" }}>Voltar</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href="/lojas" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Lojas
      </Link>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Nova Loja</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Cadastre uma nova loja maçônica na organização.</p>
      
      <div className="card">
        <StoreForm tenants={tenantMemberships.map(t => ({ id: t.tenant_id, name: (t.tenants as any)?.name || "Organização" }))} />
      </div>
    </div>
  );
}
