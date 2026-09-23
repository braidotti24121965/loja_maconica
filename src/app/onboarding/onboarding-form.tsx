"use client";

import { useActionState } from "react";
import { submitOnboarding } from "./actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await submitOnboarding(data);
  }, null);

  return (
    <form action={action} className="form">
      {state?.error && <div className="message error">{state.error}</div>}
      <div className="field">
        <label htmlFor="full_name">Nome Completo</label>
        <input 
          id="full_name" 
          name="full_name" 
          type="text" 
          required 
          placeholder="Como você gostaria de ser chamado?" 
          minLength={2} 
        />
      </div>
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Continuar"}
      </button>
    </form>
  );
}
