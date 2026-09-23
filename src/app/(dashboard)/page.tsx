import { CalendarDays, ShieldCheck, Store, Users } from "lucide-react";

const metrics = [
  ["Lojas ativas", "—", Store],
  ["Membros", "—", Users],
  ["Sessões no mês", "—", CalendarDays],
  ["Conformidade", "RLS ativo", ShieldCheck],
] as const;

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Fase 3.2</div>
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
