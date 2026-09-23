"use client";

import { useActionState, use } from "react";
import { createSession } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NovaSessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = use(params);
  
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await createSession(data);
  }, null);

  return (
    <div style={{ maxWidth: 600 }}>
      <Link href={`/lojas/${storeId}/sessoes`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
        <ArrowLeft size={16} /> Voltar para Sessões
      </Link>
      
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Nova Sessão</h1>
      <p className="subtle" style={{ marginBottom: 32 }}>Registre a data e o tipo da sessão ocorrida.</p>
      
      <div className="card">
        <form action={action} className="form">
          {state?.error && <div className="message error">{state.error}</div>}
          
          <input type="hidden" name="store_id" value={storeId} />

          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div className="field" style={{ flex: "0 0 160px" }}>
              <label htmlFor="date">Data da Sessão</label>
              <input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: "100%" }} />
            </div>

            <div className="field">
              <label htmlFor="session_type">Tipo de Sessão</label>
              <select id="session_type" name="session_type" required style={{ height: "42px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit", backgroundColor: "#fff" }}>
                <option value="Sessão Ordinária">Sessão Ordinária</option>
                <option value="Sessão Magna">Sessão Magna</option>
                <option value="Sessão Branca">Sessão Branca</option>
                <option value="Sessão de Iniciação">Sessão de Iniciação</option>
                <option value="Sessão de Elevação">Sessão de Elevação</option>
                <option value="Sessão de Exaltação">Sessão de Exaltação</option>
                <option value="Outra">Outra</option>
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 24 }}>
            <label htmlFor="description">Descrição (Opcional)</label>
            <textarea id="description" name="description" rows={5} placeholder="Breve resumo dos trabalhos..." style={{ width: "100%", padding: "12px", border: "1px solid var(--border)", borderRadius: "6px", fontFamily: "inherit" }} />
          </div>

          <button className="button" type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Registrar Sessão"}
          </button>
        </form>
      </div>
    </div>
  );
}
