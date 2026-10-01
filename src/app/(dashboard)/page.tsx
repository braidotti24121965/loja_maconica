import { createClient } from "@/lib/supabase/server";
import { CalendarDays, ShieldCheck, Store, Users } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  
  // RLS will automatically scope these counts to the stores the user has access to
  const [
    { count: storesCount },
    { count: brothersCount },
    { count: sessionsCount }
  ] = await Promise.all([
    supabase.from("stores").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("brothers").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("sessions").select("*", { count: "exact", head: true })
      .gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);

  const metrics = [
    ["Lojas ativas", storesCount?.toString() || "0", Store],
    ["Membros", brothersCount?.toString() || "0", Users],
    ["Sessões no mês", sessionsCount?.toString() || "0", CalendarDays],
    ["Conformidade", "RLS ativo", ShieldCheck],
  ] as const;

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Visão Geral</div>
          <h2>Painel de Controle</h2>
          <p>Selecione uma loja no menu lateral ou crie uma nova para começar.</p>
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
