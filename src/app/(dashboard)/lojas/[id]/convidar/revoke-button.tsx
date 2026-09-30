"use client";

import { useActionState } from "react";
import { revokeInvite } from "./actions";
import { Trash } from "lucide-react";

export function RevokeButton({ storeId, inviteId }: { storeId: string, inviteId: string }) {
  const [state, action, pending] = useActionState(async (_state: { error?: string } | null | undefined, data: FormData) => {
    return await revokeInvite(data);
  }, null);

  return (
    <form action={action}>
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="invite_id" value={inviteId} />
      <button 
        type="submit" 
        disabled={pending}
        title="Revogar Convite"
        style={{ background: "transparent", border: "none", color: "var(--destructive)", cursor: "pointer", padding: 4 }}
        onClick={(e) => {
          if (!confirm("Tem certeza que deseja revogar este convite?")) {
            e.preventDefault();
          }
        }}
      >
        <Trash size={16} />
      </button>
      {state?.error && <span style={{ color: "var(--destructive)", fontSize: 12 }}>Erro</span>}
    </form>
  );
}
