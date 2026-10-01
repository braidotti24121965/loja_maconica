import { createClient } from "@/lib/supabase/server";
import { CalendarDays, ShieldCheck, Store, Users } from "lucide-react";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // O gestor geral do SaaS possui uma área própria e não precisa estar
  // vinculado a uma loja cliente para acessar o sistema.
  const { data: isPlatformAdmin, error: platformAdminError } =
    await supabase.rpc("is_platform_admin");

  if (platformAdminError) {
    // Esta checagem serve somente para escolher o painel inicial. A área
    // /admin mantém sua própria validação fail-closed no servidor.
    console.error("Falha ao verificar administrador da plataforma na página inicial:", {
      code: platformAdminError.code,
    });
  }

  if (!platformAdminError && isPlatformAdmin) {
    redirect("/admin");
  }

  // Verifica quantas lojas o usuário tem acesso
  const { data: userStores, error } = await supabase
    .from("stores")
    .select("id")
    .eq("active", true);

  // Se o usuário tiver acesso a EXATAMENTE UMA loja, redireciona diretamente para o painel dela
  if (!error && userStores && userStores.length === 1) {
    redirect(`/lojas/${userStores[0].id}`);
  }

  // Se tiver mais de uma, redireciona para a listagem para ele escolher
  if (!error && userStores && userStores.length > 1) {
    redirect("/lojas");
  }

  // Se chegou aqui (0 lojas), mostra o dashboard vazio
  const metrics = [
    ["Lojas ativas", "0", Store],
    ["Membros", "0", Users],
    ["Sessões no mês", "0", CalendarDays],
    ["Conformidade", "RLS ativo", ShieldCheck],
  ] as const;

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Acesso Restrito</div>
          <h2>Nenhuma Loja Vinculada</h2>
          <p>Você não possui acesso a nenhuma Loja ativa no momento. Aguarde um convite ou entre em contato com a administração.</p>
        </div>
        <span className="badge"><ShieldCheck size={15}/> Ambiente Seguro</span>
      </section>
      
      <section className="grid">
        {metrics.map(([label, value, Icon]) => (
          <article className="card metric" key={label}>
            <div><span>{label}</span><strong>{value}</strong></div>
            <div className="icon"><Icon size={19}/></div>
          </article>
        ))}
      </section>
    </>
  );
}
