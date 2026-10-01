"use client";

import { useActionState } from "react";
import { login } from "./actions";
import Link from "next/link";

export function LoginForm({ error }: { error?: string }) {
  const [, action, pending] = useActionState(async (_state: null, data: FormData) => {
    await login(data);
    return null;
  }, null);

  return (
    <form action={action} className="form">
      {error && <div className="message error">{error === 'credenciais' ? 'E-mail ou senha inválidos. Tente novamente.' : decodeURIComponent(error)}</div>}
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" />
      </div>
      <div className="field">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label htmlFor="password" style={{ margin: 0 }}>Senha</label>
          <Link href="/esqueci-senha" style={{ fontSize: 13, color: "var(--brand)", textDecoration: "none" }}>
            Esqueci minha senha
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Sua senha" />
      </div>
      <button className="button" type="submit" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}
