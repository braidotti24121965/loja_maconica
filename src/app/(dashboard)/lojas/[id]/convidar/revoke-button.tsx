"use client";

import { useActionState, useState } from "react";
import { revokeInvite } from "./actions";
import { Trash } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function RevokeButton({ storeId, inviteId }: { storeId: string, inviteId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formId = `revoke-invite-${inviteId}`;
  const [state, action, pending] = useActionState(async (_state: { error?: string } | null | undefined, data: FormData) => {
    return await revokeInvite(data);
  }, null);

  return (
    <>
    <form id={formId} action={action}>
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="invite_id" value={inviteId} />
      <button 
        type="submit" 
        disabled={pending}
        title="Revogar Convite"
        style={{ background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", padding: 4 }}
        onClick={(event) => {
          event.preventDefault();
          setConfirmOpen(true);
        }}
      >
        <Trash size={16} />
      </button>
      {state?.error && <span style={{ color: "var(--destructive)", fontSize: 12 }}>Erro</span>}
    </form>
    <ConfirmDialog
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      title="Revogar convite?"
      description="O link deixará de funcionar imediatamente e será necessário enviar um novo convite para este usuário."
      confirmLabel="Revogar convite"
      pending={pending}
      formId={formId}
    />
    </>
  );
}
