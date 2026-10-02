"use client";

import { useState, useRef } from "react";
import { createEphemeris } from "./actions";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function CreateEphemerisForm({ storeId }: { storeId: string }) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await createEphemeris(formData);

    setIsPending(false);

    if (res?.error) {
      setErrorMessage(res.error);
    } else {
      formRef.current?.reset();
    }
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: 16, marginBottom: 16 }}>Cadastrar Nova Efeméride da Loja</h3>

      {errorMessage && (
        <div style={{ color: "#8f2932", fontSize: 13, marginBottom: 16, background: "#fcebed", padding: "8px 12px", borderRadius: 6 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="form">
        <input type="hidden" name="store_id" value={storeId} />

        {/* Linha 1: Título, Dia, Mês, Ano, Categoria */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "2 1 200px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="title">Título da Efeméride</label>
            <input id="title" name="title" type="text" required placeholder="Ex: Aniversário de Fundação da Loja" style={{ height: "44px" }} />
          </div>

          <div className="field" style={{ flex: "1 1 90px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="day">Dia (1-31)</label>
            <input id="day" name="day" type="number" min={1} max={31} required placeholder="Ex: 14" style={{ height: "44px" }} />
          </div>

          <div className="field" style={{ flex: "1 1 120px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="month">Mês (1-12)</label>
            <select id="month" name="month" required style={{ width: "100%", height: "44px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "8px", background: "#fff" }}>
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{idx + 1} - {name}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: "1 1 140px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="year">Ano (Opcional)</label>
            <input id="year" name="year" type="number" placeholder="Ex: 1980" style={{ height: "44px" }} />
          </div>

          <div className="field" style={{ flex: "1.5 1 180px", minWidth: 0, marginBottom: 0 }}>
            <label htmlFor="category">Categoria</label>
            <select id="category" name="category" required defaultValue="store_anniversary" style={{ width: "100%", height: "44px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "8px", background: "#fff" }}>
              <option value="store_anniversary">Fundação / Aniversário da Loja</option>
              <option value="masonic_history">História Maçônica</option>
              <option value="commemorative">Comemorativa</option>
              <option value="other">Outra</option>
            </select>
          </div>
        </div>

        {/* Linha 2: Descrição com Botão Salvar alinhado ao CONTEÚDO (caixa do textarea) */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: 1, minWidth: "260px", marginBottom: 0 }}>
            <label htmlFor="description">Descrição / História (Opcional)</label>
            <textarea id="description" name="description" rows={1} placeholder="Breve resumo sobre esta data..." style={{ height: "44px", padding: "10px 12px", resize: "none" }} />
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              backgroundColor: isPending ? "#6b7280" : "#0f766e",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
              padding: "0 22px",
              height: "44px",
              borderRadius: 8,
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              boxShadow: isPending ? "none" : "0 2px 6px rgba(15, 118, 110, 0.3)",
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "Salvando..." : "Salvar Efeméride"}
          </button>
        </div>
      </form>
    </div>
  );
}
