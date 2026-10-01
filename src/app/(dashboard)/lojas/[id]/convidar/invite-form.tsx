"use client";

import { useActionState } from "react";
import { generateInvite } from "./actions";

export function InviteForm({ storeId, actorRole, initialEmail }: { storeId: string; actorRole: string; initialEmail?: string }) {
  const [state, action, pending] = useActionState(async (_state: { error?: string; success?: string } | null | undefined, data: FormData) => {
    return await generateInvite(data);
  }, null);

  return (
    <div>
      {state?.success ? (
        <div style={{ padding: 24, background: "var(--green-soft)", borderRadius: 8, border: "1px solid var(--green-dark)" }}>
          <h3 style={{ color: "var(--green-dark)", marginBottom: 12 }}>Convite enviado!</h3>
          <p style={{ fontSize: 14, margin: 0 }}>{state.success} O link expira em 7 dias e só pode ser usado uma vez.</p>
        </div>
      ) : (
        <form action={action} className="form">
          {state?.error && <div className="message error">{state.error}</div>}
          
          <input type="hidden" name="store_id" value={storeId} />

          <div className="field">
            <label htmlFor="email">E-mail do Convidado</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              defaultValue={initialEmail || ""}
              placeholder="email@exemplo.com" 
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 16 }}
            />
          </div>

          <div className="field">
            <label htmlFor="role">Papel do Convidado</label>
            <select id="role" name="role" required defaultValue="member" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 24, background: "#fff" }}>
              {actorRole === "admin" && <option value="admin">Venerável Mestre (Admin)</option>}
              <option value="member">Membro (Padrão)</option>
              <option value="treasurer">Tesoureiro</option>
              {actorRole === "admin" && <option value="secretary">Secretário</option>}
              <option value="viewer">Apenas Visualização</option>
            </select>
          </div>

          <button className="button" type="submit" disabled={pending} style={{ width: "100%", padding: "10px 0" }}>
            {pending ? "Enviando..." : "Enviar Convite Seguro"}
          </button>
        </form>
      )}
    </div>
  );
}
