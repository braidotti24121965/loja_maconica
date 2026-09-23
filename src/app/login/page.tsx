import { hasSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const configured = hasSupabaseEnv();
  return (
    <main className="login-page">
      <section className="login-art">
        <span className="eyebrow" style={{ color: "#e6c778" }}>Gestão com propósito</span>
        <h1>Controle de Lojas Maçônicas</h1>
        <p>Uma base segura, organizada e independente para administrar lojas, membros e atividades respeitando cada jurisdição.</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">Acesso restrito</span>
          <h2>Bem-vindo</h2>
          <p className="subtle">Entre com as credenciais fornecidas pela sua administração.</p>
          {!configured ? (
            <div className="message success" style={{ marginTop: 24 }}>Interface pronta. Conecte o projeto Supabase no arquivo de ambiente para habilitar o acesso.</div>
          ) : <LoginForm error={erro} />}
        </div>
      </section>
    </main>
  );
}
