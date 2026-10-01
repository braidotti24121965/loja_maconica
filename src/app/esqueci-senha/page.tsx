"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { requestPasswordReset } from "./actions";

export default function EsqueciSenhaPage() {
  const [state, action, pending] = useActionState(
    async (_state: { error?: string; success?: string } | null, data: FormData) => {
      return await requestPasswordReset(data);
    },
    null
  );

  return (
    <main className="login-page">
      <section className="login-art">
        <span className="eyebrow" style={{ color: "#e6c778" }}>Recuperação de Acesso</span>
        <h1>Esqueceu sua senha?</h1>
        <p>Informe o e-mail cadastrado na sua ficha de membro para receber o link seguro de redefinição.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 14, color: "var(--subtle)", textDecoration: "none" }}>
            <ArrowLeft size={16} /> Voltar para o Login
          </Link>

          <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <KeyRound size={16} /> Redefinição de Senha
          </span>
          <h2 style={{ marginTop: 4 }}>Recuperar Acesso</h2>
          <p className="subtle">Digite seu e-mail cadastrado para receber as instruções.</p>

          <form action={action} className="form" style={{ marginTop: 24 }}>
            {state?.error && <div className="message error">{state.error}</div>}
            {state?.success && <div className="message success">{state.success}</div>}

            <div className="field">
              <label htmlFor="email">E-mail Cadastrado</label>
              <input id="email" name="email" type="email" required placeholder="voce@exemplo.com.br" />
            </div>

            <button className="button" type="submit" disabled={pending}>
              {pending ? "Enviando e-mail..." : "Enviar Link de Redefinição"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
