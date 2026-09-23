import { Building2, CalendarDays, LayoutDashboard, ShieldCheck, Store, Users } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

const metrics = [
  ["Lojas ativas", "—", Store],
  ["Membros", "—", Users],
  ["Sessões no mês", "—", CalendarDays],
  ["Conformidade", "RLS ativo", ShieldCheck],
] as const;

export default async function Home() {
  let email = "ambiente local";
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? "usuário";
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">CL</div><div className="brand-copy"><strong>Controle de Lojas</strong><small>Administração</small></div></div>
        <nav className="nav" aria-label="Navegação principal">
          <a className="active" href="#"><LayoutDashboard size={18}/><span>Visão geral</span></a>
          <a href="#"><Building2 size={18}/><span>Tenants</span></a>
          <a href="#"><Store size={18}/><span>Lojas</span></a>
          <a href="#"><Users size={18}/><span>Usuários</span></a>
        </nav>
        <div className="tenant-card"><small>Contexto atual</small><div style={{ marginTop: 5, fontWeight: 700 }}>Estrutura multi-tenant</div></div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><h1>Visão geral</h1><p>Fundação do ambiente de homologação</p></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">{email.slice(0, 2).toUpperCase()}</div>
            {hasSupabaseEnv() && <form action={logout}><button className="button" style={{ minHeight: 38 }}>Sair</button></form>}
          </div>
        </header>
        <div className="content">
          <section className="hero"><div><div className="eyebrow">Fase 3.1</div><h2>Fundação pronta para evoluir</h2><p>Arquitetura Tenant → Loja → Usuário com autenticação e isolamento de dados como padrão.</p></div><span className="badge"><ShieldCheck size={15}/> Ambiente de homologação</span></section>
          <section className="grid">{metrics.map(([label,value,Icon]) => <article className="card metric" key={label}><div><span>{label}</span><strong>{value}</strong></div><div className="icon"><Icon size={19}/></div></article>)}</section>
          <section className="section-grid">
            <article className="card"><h3>Checklist da fundação</h3><p className="subtle">Componentes estruturais da primeira entrega.</p><div className="steps">
              {["Aplicação Next.js e TypeScript", "Autenticação Supabase SSR", "Modelo multi-tenant e RLS", "Layout responsivo e acessível"].map((item,i)=><div className="step" key={item}><div className="step-num">{i+1}</div><strong>{item}</strong><span className="status">Preparado</span></div>)}
            </div></article>
            <article className="card"><h3>Próximo marco</h3><p className="subtle">Cadastros essenciais e convite seguro de usuários entram na Fase 3.2.</p><div style={{ marginTop: 22, padding: 16, background: "var(--green-soft)", borderRadius: 9 }}><strong style={{ color: "var(--green-dark)" }}>Sem produção</strong><p className="subtle" style={{ marginTop: 6 }}>Nenhuma promoção para produção será feita sem aprovação explícita.</p></div></article>
          </section>
        </div>
      </main>
    </div>
  );
}
