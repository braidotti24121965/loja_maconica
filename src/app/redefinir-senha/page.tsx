"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { updatePassword } from "./actions";

export default function RedefinirSenhaPage() {
  const [state, action, pending] = useActionState(
    async (_state: { error?: string } | null, data: FormData) => {
      return await updatePassword(data);
    },
    null
  );

  return (
    <main className="login-page">
      <section className="login-art">
        <span className="eyebrow" style={{ color: "#9dd8cf" }}>Nova Senha</span>
        <h1>Cadastrar Nova Senha</h1>
        <p>Sua identidade foi confirmada com sucesso. Defina sua nova senha para acessar a plataforma.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={16} /> Acesso Seguro
          </span>
          <h2 style={{ marginTop: 4 }}>Redefinir Senha</h2>
          <p className="subtle">Digite sua nova senha abaixo.</p>

          <form action={action} className="form" style={{ marginTop: 24 }}>
            {state?.error && <div className="message error">{state.error}</div>}

            <div className="field">
              <label htmlFor="password">Nova Senha (Mínimo 6 caracteres)</label>
              <input id="password" name="password" type="password" required minLength={6} placeholder="Sua nova senha" />
            </div>

            <div className="field">
              <label htmlFor="confirm_password">Confirmar Nova Senha</label>
              <input id="confirm_password" name="confirm_password" type="password" required minLength={6} placeholder="Repita a nova senha" />
            </div>

            <button className="button" type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar Nova Senha e Acessar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
