"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ error }: { error?: string }) {
  const [, action, pending] = useActionState(async (_state: null, data: FormData) => {
    await login(data);
    return null;
  }, null);

  return (
    <form action={action} className="form">
      {error && <div className="message error">E-mail ou senha inválidos. Tente novamente.</div>}
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Sua senha" />
      </div>
      <button className="button" type="submit" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}
