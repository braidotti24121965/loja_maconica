"use client";

import { useActionState, useState } from "react";
import { uploadAta } from "./actions";

export function UploadAtaForm({ storeId, sessionId }: { storeId: string, sessionId: string }) {
  const [file, setFile] = useState<File | null>(null);

  const [state, action, pending] = useActionState(async (_state: any, data: FormData) => {
    if (!file) return { error: "Selecione um arquivo PDF." };
    data.append("file", file);
    return await uploadAta(data);
  }, null);

  return (
    <form action={action} className="form">
      <h4 style={{ marginBottom: 16 }}>Anexar nova Ata</h4>
      
      {state?.error && <div className="message error">{state.error}</div>}
      
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="session_id" value={sessionId} />

      <div className="field">
        <label htmlFor="file">Arquivo PDF</label>
        <input 
          id="file" 
          type="file" 
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required 
          style={{ padding: "8px", border: "1px dashed var(--border)", borderRadius: 6, width: "100%" }}
        />
      </div>

      <button className="button" type="submit" disabled={pending || !file}>
        {pending ? "Enviando..." : "Salvar Ata"}
      </button>
    </form>
  );
}
