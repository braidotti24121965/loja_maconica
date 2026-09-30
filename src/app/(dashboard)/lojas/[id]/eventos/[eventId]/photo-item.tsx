/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState } from "react";
import { deletePhoto } from "../actions";
import { Trash } from "lucide-react";

export function PhotoItem({ storeId, eventId, photoId, storagePath, url, isAdmin }: { storeId: string, eventId: string, photoId: string, storagePath: string, url: string, isAdmin: boolean }) {
  const [state, action, pending] = useActionState(async (_state: { error?: string, success?: boolean } | null | undefined, data: FormData) => {
    return await deletePhoto(data);
  }, null);

  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1/1", background: "#f0f0f0" }}>
      <img src={url} alt="Foto do Evento" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: pending ? 0.5 : 1 }} />
      
      {isAdmin && (
        <form action={action}>
          <input type="hidden" name="store_id" value={storeId} />
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="photo_id" value={photoId} />
          <input type="hidden" name="storage_path" value={storagePath} />
          <button 
            type="submit" 
            title="Excluir Foto"
            disabled={pending}
            onClick={(e) => {
              if(!confirm("Tem certeza que deseja excluir esta foto?")) e.preventDefault();
            }}
            style={{ 
              position: "absolute", top: 8, right: 8, 
              background: "rgba(255,0,0,0.8)", color: "white", 
              border: "none", borderRadius: "50%", 
              width: 32, height: 32, 
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer" 
            }}
          >
            <Trash size={16} />
          </button>
          {state?.error && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(255,0,0,0.8)", color: "white", fontSize: 10, padding: 4, textAlign: "center" }}>{state.error}</div>}
        </form>
      )}
    </div>
  );
}
