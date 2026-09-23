import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  // Check if profile already exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .single();

  if (profile) {
    redirect("/"); // Already completed onboarding
  }

  return (
    <main className="login-page">
      <section className="login-art">
        <span className="eyebrow" style={{ color: "#e6c778" }}>Primeiro Acesso</span>
        <h1>Bem-vindo!</h1>
        <p>Precisamos de alguns detalhes básicos para configurar o seu perfil antes de acessar o sistema.</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">Perfil de Usuário</span>
          <h2>Qual o seu nome?</h2>
          <p className="subtle">Este será o nome exibido para os outros membros da sua loja.</p>
          <div style={{ marginTop: 24 }}>
            <OnboardingForm />
          </div>
        </div>
      </section>
    </main>
  );
}
