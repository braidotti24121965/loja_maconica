"use client";

import { useActionState, useState } from "react";
import { updateRole, removeMember } from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function MemberList({ member, isAdmin, storeId, currentUserId }: { member: { id: string; user_id: string; role: string; profiles: { full_name: string; email: string } | { full_name: string; email: string }[] }, isAdmin: boolean, storeId: string, currentUserId: string }) {
  const isMe = member.user_id === currentUserId;
  const [isEditing, setIsEditing] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const removeFormId = `remove-member-${member.user_id}`;

  const [updateState, updateAction, isUpdating] = useActionState(async (_state: { error?: string } | null | undefined, data: FormData) => {
    const res = await updateRole(data);
    if (res?.success) setIsEditing(false);
    return res;
  }, null);

  const [, removeAction, isRemoving] = useActionState(async (_state: { error?: string } | null | undefined, data: FormData) => {
    return await removeMember(data);
  }, null);

  if (!isAdmin) {
    return <span className="badge">{member.role}</span>;
  }

  if (isEditing) {
    return (
      <form action={updateAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="user_id" value={member.user_id} />
        <select name="role" defaultValue={member.role} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
          <option value="admin">Venerável Mestre (Admin)</option>
          <option value="secretary">Secretário</option>
          <option value="treasurer">Tesoureiro</option>
          <option value="member">Membro (Padrão)</option>
          <option value="viewer">Visitante/Visualizador</option>
        </select>
        <button type="submit" disabled={isUpdating} style={{ background: "var(--brand)", color: "white", padding: "4px 12px", borderRadius: 4, border: "none", cursor: "pointer" }}>Salvar</button>
        <button type="button" onClick={() => setIsEditing(false)} style={{ background: "transparent", color: "var(--subtle)", border: "none", cursor: "pointer" }}>Cancelar</button>
        {updateState?.error && <span style={{ color: "var(--destructive)", fontSize: 12 }}>{updateState.error}</span>}
      </form>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span className="badge">{member.role}</span>
      
      {!isMe && (
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => setIsEditing(true)} style={{ background: "transparent", color: "var(--subtle)", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Alterar</button>
          
          <form id={removeFormId} action={removeAction}>
            <input type="hidden" name="store_id" value={storeId} />
            <input type="hidden" name="user_id" value={member.user_id} />
            <button type="button" disabled={isRemoving} onClick={() => setRemoveOpen(true)} style={{ background: "transparent", color: "var(--destructive)", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>
              {isRemoving ? "..." : "Remover"}
            </button>
          </form>
          <ConfirmDialog
            open={removeOpen}
            onClose={() => setRemoveOpen(false)}
            title="Remover membro da Loja?"
            description="Este usuário perderá o acesso à Loja e aos módulos vinculados ao seu cargo. O cadastro do Irmão não será excluído."
            confirmLabel="Remover membro"
            pending={isRemoving}
            formId={removeFormId}
          />
        </div>
      )}
    </div>
  );
}
