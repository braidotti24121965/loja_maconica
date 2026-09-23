"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await updateProfile(data);
  }, null);

  return (
    <form action={action} className="form">
      {state?.error && <div className="message error">{state.error}</div>}
      {state?.success && <div className="message success">Perfil atualizado com sucesso.</div>}
      <div className="field">
        <label htmlFor="full_name">Nome Completo</label>
        <input 
          id="full_name" 
          name="full_name" 
          type="text" 
          required 
          defaultValue={initialName}
          minLength={2} 
        />
      </div>
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
