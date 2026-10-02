"use client";

import { useState } from "react";
import { Pencil, Trash, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteEphemeris, updateEphemeris } from "./actions";

export interface EphemerisItemData {
  item_id: string;
  title: string;
  description: string | null;
  day: number;
  month: number;
  year: number | null;
  category: string;
}

export function EphemerisActions({
  storeId,
  ephemeris,
}: {
  storeId: string;
  ephemeris: EphemerisItemData;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const deleteFormId = `delete-ephemeris-${ephemeris.item_id}`;

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const res = await updateEphemeris(formData);

    setIsPending(false);
    if (res?.error) {
      setErrorMessage(res.error);
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {errorMessage && (
        <div style={{ color: "#8f2932", fontSize: 12, marginBottom: 8, background: "#fcebed", padding: "4px 8px", borderRadius: 4 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setIsEditing(true);
          }}
          style={{
            backgroundColor: "#f0fdf4",
            color: "#0f766e",
            border: "1px solid #0f766e",
            fontWeight: 600,
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
          }}
        >
          <Pencil size={13} /> Editar
        </button>

        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setIsDeleting(true);
          }}
          style={{
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fca5a5",
            fontWeight: 600,
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
          }}
        >
          <Trash size={13} /> Excluir
        </button>
      </div>

      {/* Confirm Exclusão */}
      <form
        id={deleteFormId}
        action={async (formData) => {
          setErrorMessage(null);
          const res = await deleteEphemeris(formData);
          if (res?.error) setErrorMessage(res.error);
          setIsDeleting(false);
        }}
      >
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="ephemeris_id" value={ephemeris.item_id} />
      </form>

      <ConfirmDialog
        open={isDeleting}
        onClose={() => setIsDeleting(false)}
        title="Excluir Efeméride?"
        description={`A efeméride "${ephemeris.title}" será removida do calendário da loja. Esta ação não poderá ser desfeita.`}
        confirmLabel="Excluir"
        formId={deleteFormId}
      />

      {/* Modal de Edição */}
      {isEditing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 520, width: "100%", background: "#fff", borderRadius: 8, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Pencil color="var(--brand)" size={18} /> Editar Efeméride da Loja
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--subtle)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <input type="hidden" name="store_id" value={storeId} />
              <input type="hidden" name="ephemeris_id" value={ephemeris.item_id} />

              <div className="field" style={{ gridColumn: "span 2", marginBottom: 0 }}>
                <label htmlFor="edit_title">Título da Efeméride</label>
                <input id="edit_title" name="title" type="text" required defaultValue={ephemeris.title} style={{ height: 38 }} />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="edit_date">Data da Efeméride</label>
                <input
                  id="edit_date"
                  name="date"
                  type="date"
                  required
                  defaultValue={`${ephemeris.year || new Date().getFullYear()}-${String(ephemeris.month).padStart(2, "0")}-${String(ephemeris.day).padStart(2, "0")}`}
                  style={{ height: 38 }}
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="edit_category">Categoria</label>
                <select id="edit_category" name="category" required defaultValue={ephemeris.category || "store_anniversary"} style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)", background: "#fff" }}>
                  <option value="store_anniversary">Fundação / Aniversário da Loja</option>
                  <option value="masonic_history">História Maçônica</option>
                  <option value="commemorative">Comemorativa</option>
                  <option value="other">Outra</option>
                </select>
              </div>

              <div className="field" style={{ gridColumn: "span 2", marginBottom: 0 }}>
                <label htmlFor="edit_description">Descrição / História (Opcional)</label>
                <textarea id="edit_description" name="description" rows={3} defaultValue={ephemeris.description || ""} placeholder="Breve resumo..." />
              </div>

              <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="subtle"
                  style={{ background: "transparent", border: "1px solid var(--border)", padding: "8px 16px" }}
                >
                  Cancelar
                </button>
                <button type="submit" className="button" disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
