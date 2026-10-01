import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NovaLojaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>Acesso Negado</h3>
        <p className="subtle">Apenas o dono da plataforma (SaaS) tem permissão para provisionar novas Lojas e Tenants.</p>
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
      <p className="subtle" style={{ marginBottom: 32 }}>O provisionamento de novos Tenants deve ser feito pelo administrador da plataforma.</p>
      
      <div className="card">
        <p>A criação de Lojas e Tenants via interface está temporariamente desativada. Para provisionar uma nova Loja, crie o Tenant e a Loja via banco de dados.</p>
      </div>
    </div>
  );
}
