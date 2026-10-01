"use client";

import { useState } from "react";
import { saveAttendance } from "./actions";

type Brother = { id: string, full_name: string, degree: string };
type Attendance = { brother_id: string, status: string, justification: string | null };

export function FrequenciaList({ 
  storeId, sessionId, brothers, initialAttendances, readOnly 
}: { 
  storeId: string, sessionId: string, brothers: Brother[], initialAttendances: Attendance[], readOnly: boolean 
}) {
  const [attendances, setAttendances] = useState<Record<string, Attendance>>(
    initialAttendances.reduce((acc, curr) => ({ ...acc, [curr.brother_id]: curr }), {})
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleStatusChange = (brotherId: string, status: string) => {
    setAttendances(prev => ({
      ...prev,
      [brotherId]: { ...prev[brotherId], brother_id: brotherId, status, justification: status === 'justified' ? prev[brotherId]?.justification || '' : null }
    }));
  };

  const handleJustificationChange = (brotherId: string, text: string) => {
    setAttendances(prev => ({
      ...prev,
      [brotherId]: { ...prev[brotherId], justification: text }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const dataToSave = Object.values(attendances);
      const res = await saveAttendance(storeId, sessionId, dataToSave);
      if (res?.error) {
        setMessage(res.error);
      } else {
        setMessage("✅ Presenças salvas com sucesso!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        {brothers.map(brother => {
          const current = attendances[brother.id];
          const isJustified = current?.status === "justified";

          return (
            <div key={brother.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: "1 1 200px" }}>
                <strong>{brother.full_name}</strong>
                <span className="subtle" style={{ display: "block", fontSize: 12 }}>{brother.degree}</span>
              </div>
              
              {!readOnly ? (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
                    <select 
                      className="input" 
                      value={current?.status || ""} 
                      onChange={e => handleStatusChange(brother.id, e.target.value)}
                    >
                      <option value="" disabled>Selecione...</option>
                      <option value="present">🟢 Presente</option>
                      <option value="absent">🔴 Faltou</option>
                      <option value="justified">🟡 Falta Justificada</option>
                    </select>
                  </div>

                  {isJustified && (
                    <div className="field" style={{ marginBottom: 0, flex: "1 1 200px" }}>
                      <input 
                        type="text" 
                        placeholder="Motivo da falta..." 
                        value={current.justification || ""}
                        onChange={e => handleJustificationChange(brother.id, e.target.value)}
                        className="input"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {current?.status === 'present' && <span style={{ color: "var(--green-dark)", fontWeight: "bold" }}>Presente</span>}
                  {current?.status === 'absent' && <span style={{ color: "#8f2932", fontWeight: "bold" }}>Faltou</span>}
                  {current?.status === 'justified' && (
                    <span style={{ color: "#b48600", fontWeight: "bold" }}>Justificado: <span style={{ fontWeight: "normal" }}>{current.justification}</span></span>
                  )}
                  {!current?.status && <span className="subtle">Não registrado</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={handleSave} disabled={saving} className="button">
            {saving ? "Salvando..." : "Salvar Frequência"}
          </button>
          {message && <span style={{ fontSize: 14, color: message.includes("Erro") ? "#8f2932" : "var(--green-dark)", fontWeight: "bold" }}>{message}</span>}
        </div>
      )}
    </div>
  );
}
