"use client";

import { useActionState, useState } from "react";
import { generateInvite } from "./actions";
import { Copy, Check } from "lucide-react";

export function InviteForm({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    return await generateInvite(data);
  }, null);
  
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (state?.inviteUrl) {
      navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      {state?.inviteUrl ? (
        <div style={{ padding: 24, background: "var(--green-soft)", borderRadius: 8, border: "1px solid var(--green-dark)" }}>
          <h3 style={{ color: "var(--green-dark)", marginBottom: 12 }}>Convite Gerado com Sucesso!</h3>
          <p style={{ fontSize: 14, marginBottom: 16 }}>Envie o link abaixo para a pessoa. O link expira em 7 dias e só pode ser usado uma vez.</p>
          
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              type="text" 
              readOnly 
              value={state.inviteUrl} 
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)" }}
            />
            <button type="button" className="button" onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      ) : (
        <form action={action} className="form">
          {state?.error && <div className="message error">{state.error}</div>}
          
          <input type="hidden" name="store_id" value={storeId} />

          <div className="field">
            <label htmlFor="role">Papel do Convidado</label>
            <select id="role" name="role" required defaultValue="member">
              <option value="admin">Venerável Mestre (Admin)</option>
              <option value="member">Membro (Padrão)</option>
              <option value="treasurer">Tesoureiro</option>
              <option value="secretary">Secretário</option>
              <option value="viewer">Apenas Visualização</option>
            </select>
          </div>

          <button className="button" type="submit" disabled={pending}>
            {pending ? "Gerando..." : "Gerar Link de Convite"}
          </button>
        </form>
      )}
    </div>
  );
}
