"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { deletePhoto, setCoverPhoto } from "../actions";
import { Star, Trash } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function PhotoItem({ storeId, eventId, photoId, url, isAdmin, isCover }: { storeId: string; eventId: string; photoId: string; url: string; isAdmin: boolean; isCover: boolean }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteFormId = `delete-photo-${photoId}`;
  const [state, action, pending] = useActionState(async (_state: { error?: string, success?: boolean } | null | undefined, data: FormData) => {
    return await deletePhoto(data);
  }, null);
  const [coverState, coverAction, coverPending] = useActionState(async (_state: { error?: string, success?: boolean } | null | undefined, data: FormData) => {
    return await setCoverPhoto(data);
  }, null);

  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1/1", background: "#f0f0f0" }}>
      {url && <Image src={url} alt="Foto do evento" fill sizes="(max-width: 640px) 100vw, 240px" unoptimized style={{ objectFit: "cover", opacity: pending ? 0.5 : 1 }} />}
      {isCover && <span className="badge" style={{ position: "absolute", left: 8, top: 8 }}>Capa</span>}
      
      {isAdmin && (
        <form id={deleteFormId} action={action}>
          <input type="hidden" name="store_id" value={storeId} />
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="photo_id" value={photoId} />
          <button 
            type="button"
            title="Excluir Foto"
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
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
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir foto do evento?"
        description="A imagem será removida da galeria e do armazenamento. Esta ação não poderá ser desfeita."
        confirmLabel="Excluir foto"
        pending={pending}
        formId={deleteFormId}
      />
      {isAdmin && !isCover && (
        <form action={coverAction} style={{ position: "absolute", bottom: 8, right: 8 }}>
          <input type="hidden" name="store_id" value={storeId} />
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="photo_id" value={photoId} />
          <button type="submit" className="button" disabled={coverPending} title="Definir como capa" style={{ padding: 8 }}>
            <Star size={16} />
          </button>
          {coverState?.error && <span className="message error">{coverState.error}</span>}
        </form>
      )}
    </div>
  );
}
