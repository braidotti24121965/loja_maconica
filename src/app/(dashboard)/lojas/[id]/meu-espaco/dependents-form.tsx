"use client";

import { useState } from "react";
import { addDependent, deleteDependent, editDependent } from "../membros/[brotherId]/actions";
import { Trash, Pencil, HeartHandshake } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  birthdate: string | null;
}

export function MyDependentsSection({
  storeId,
  brotherId,
  dependents,
}: {
  storeId: string;
  brotherId: string;
  dependents: Dependent[];
}) {
  const [editingDep, setEditingDep] = useState<Dependent | null>(null);
  const [dependentToDelete, setDependentToDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteFormId = `delete-dep-${brotherId}`;

  return (
    <div className="card">
      <h2 style={{ fontSize: 16, margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <HeartHandshake size={18} color="var(--brand)" /> Família e Dependentes
      </h2>
      <p className="subtle" style={{ fontSize: 13, marginBottom: 20 }}>
        Cadastre sua esposa, filhos e familiares para que seus aniversários sejam celebrados nas Efemérides da Loja.
      </p>

      {dependents.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0" }}>
          {dependents.map((dep) => (
            <li
              key={dep.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                marginBottom: 8,
                backgroundColor: "var(--page)",
              }}
            >
              <div>
                <strong style={{ fontSize: 14 }}>{dep.name}</strong>{" "}
                <span className="badge" style={{ marginLeft: 6, fontSize: 11 }}>
                  {dep.relationship}
                </span>
                {dep.birthdate && (
                  <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
                    Nascimento: {new Date(dep.birthdate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setEditingDep(dep)}
                  style={{ background: "transparent", border: "none", color: "var(--brand)", cursor: "pointer", padding: 4 }}
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDependentToDelete({ id: dep.id, name: dep.name })}
                  style={{ background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", padding: 4 }}
                  title="Remover"
                >
                  <Trash size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle" style={{ fontSize: 13, marginBottom: 20, fontStyle: "italic" }}>
          Nenhum familiar cadastrado ainda.
        </p>
      )}

      <form id={deleteFormId} action={deleteDependent}>
        <input type="hidden" name="id" value={dependentToDelete?.id ?? ""} />
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="brother_id" value={brotherId} />
      </form>

      <ConfirmDialog
        open={Boolean(dependentToDelete)}
        onClose={() => setDependentToDelete(null)}
        title="Remover familiar?"
        description={`${dependentToDelete?.name ?? "Este familiar"} será removido dos seus dependentes. Esta ação não poderá ser desfeita.`}
        confirmLabel="Remover familiar"
        formId={deleteFormId}
      />

      <form
        action={async (formData) => {
          if (editingDep) {
            await editDependent(formData);
            setEditingDep(null);
          } else {
            await addDependent(formData);
          }
        }}
        className="form"
        style={{
          background: editingDep ? "#fffbe6" : "var(--page)",
          padding: 16,
          borderRadius: 6,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
            {editingDep ? "Editar Familiar" : "Adicionar Novo Familiar"}
          </h4>
          {editingDep && (
            <button
              type="button"
              onClick={() => setEditingDep(null)}
              className="subtle"
              style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
            >
              Cancelar
            </button>
          )}
        </div>

        {editingDep && <input type="hidden" name="id" value={editingDep.id} />}
        <input type="hidden" name="brother_id" value={brotherId} />
        <input type="hidden" name="store_id" value={storeId} />

        <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
          <div className="field" style={{ flex: 2, marginBottom: 0 }}>
            <input
              name="name"
              type="text"
              required
              placeholder="Nome do familiar"
              defaultValue={editingDep?.name || ""}
              style={{ height: 38, fontSize: 13 }}
              key={editingDep?.id || "new-name"}
            />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <select
              name="relationship"
              required
              defaultValue={editingDep?.relationship || "Esposa"}
              style={{
                width: "100%",
                height: 38,
                padding: "0 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontFamily: "inherit",
                backgroundColor: "#fff",
                fontSize: 13,
              }}
              key={editingDep?.id || "new-rel"}
            >
              <option value="Esposa">Esposa</option>
              <option value="Filho(a)">Filho(a)</option>
              <option value="Pai">Pai</option>
              <option value="Mãe">Mãe</option>
              <option value="Enteado(a)">Enteado(a)</option>
              <option value="Sogro(a)">Sogro(a)</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <input
              name="birthdate"
              type="date"
              placeholder="Nascimento"
              defaultValue={editingDep?.birthdate || ""}
              style={{ height: 38, fontSize: 13 }}
              key={editingDep?.id || "new-date"}
            />
          </div>
          <button className="button" type="submit" style={{ height: 38, padding: "0 14px", fontSize: 13 }}>
            {editingDep ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
}
