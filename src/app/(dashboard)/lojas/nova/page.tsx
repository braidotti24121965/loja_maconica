import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StoreForm } from "./store-form";

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

  // Se for admin da plataforma, buscamos os tenants para ele escolher (ou ele pode criar)
  const { data: tenants } = await supabase.from("tenants").select("id, name").order("name");

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Painel Admin
      </Link>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Provisionar Nova Loja</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Crie uma nova Loja (o Tenant correspondente será gerado automaticamente se não escolhido).</p>
      
      <div className="card">
        <StoreForm tenants={tenants || []} />
      </div>
    </div>
  );
}
