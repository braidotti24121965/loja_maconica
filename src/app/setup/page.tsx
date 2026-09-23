import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { setupFirstTenant } from "./actions";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verifica se já existe algum tenant no sistema
  const { count } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ margin: "auto", textAlign: "center" }}>
          <h2>Sistema já inicializado</h2>
          <p className="subtle">Já existe uma organização cadastrada no banco de dados.</p>
          <Link href="/" className="button" style={{ marginTop: 24, display: "inline-block" }}>Ir para o Painel</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ margin: "auto", textAlign: "center" }}>
        <span className="eyebrow" style={{ color: "var(--green-dark)" }}>Configuração Inicial</span>
        <h2>Criar Primeira Organização</h2>
        <p className="subtle" style={{ marginBottom: 24 }}>Você é o primeiro usuário do sistema. Defina o nome da sua Organização Mestra (Tenant) para começar a criar lojas.</p>
        
        <form action={setupFirstTenant} className="form" style={{ textAlign: "left" }}>
          <div className="field">
            <label htmlFor="tenant_name">Nome da Organização</label>
            <input type="text" id="tenant_name" name="tenant_name" required placeholder="Ex: Grande Oriente..." minLength={3} />
          </div>
          <button type="submit" className="button">Inicializar Sistema</button>
        </form>
      </div>
    </div>
  );
}
