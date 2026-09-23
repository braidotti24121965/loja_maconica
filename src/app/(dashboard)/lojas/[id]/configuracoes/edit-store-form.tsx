"use client";

import { useActionState } from "react";
import { updateStore } from "./actions";

export function EditStoreForm({ store }: { store: any }) {
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await updateStore(data);
  }, null);

  return (
    <form action={action} className="form">
      {state?.error && <div className="message error">{state.error}</div>}
      {state?.success && <div className="message success">Dados atualizados com sucesso!</div>}
      
      <input type="hidden" name="store_id" value={store.id} />

      <div className="field">
        <label htmlFor="name">Nome da Loja</label>
        <input id="name" name="name" type="text" defaultValue={store.name} required />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="field">
          <label htmlFor="city">Cidade</label>
          <input id="city" name="city" type="text" defaultValue={store.city} required />
        </div>
        <div className="field">
          <label htmlFor="state">Estado (UF)</label>
          <input id="state" name="state" type="text" defaultValue={store.state} required maxLength={2} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="active">
          <input type="checkbox" id="active" name="active" defaultChecked={store.active} style={{ marginRight: 8 }} />
          Loja Ativa
        </label>
      </div>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar Alterações"}
      </button>
    </form>
  );
}
