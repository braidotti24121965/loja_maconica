"use client";

import { useActionState } from "react";
import { createStore } from "./actions";

type TenantOption = { id: string, name: string };

export function StoreForm({ tenants }: { tenants: TenantOption[] }) {
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await createStore(data);
  }, null);

  return (
    <form action={action} className="form">
      {state?.error && <div className="message error">{state.error}</div>}
      
      {tenants.length > 1 ? (
        <div className="field">
          <label htmlFor="tenant_id">Organização (Tenant)</label>
          <select id="tenant_id" name="tenant_id" required>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="tenant_id" value={tenants[0]?.id} />
      )}

      <div className="field">
        <label htmlFor="name">Nome da Loja</label>
        <input id="name" name="name" type="text" required placeholder="Ex: A.R.L.S. Luz e Verdade" minLength={2} />
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="number">Número</label>
          <input id="number" name="number" type="text" placeholder="Ex: 1234" />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="city">Cidade</label>
          <input id="city" name="city" type="text" placeholder="Ex: São Paulo" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="state">UF</label>
          <input id="state" name="state" type="text" maxLength={2} placeholder="Ex: SP" />
        </div>
      </div>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar Loja"}
      </button>
    </form>
  );
}
