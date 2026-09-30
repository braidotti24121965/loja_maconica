"use client";

import { useActionState, useRef, useState } from "react";
import { uploadPhoto } from "../actions";
import { Upload } from "lucide-react";

export function GalleryUploader({ storeId, eventId }: { storeId: string, eventId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [state, action, pending] = useActionState(async (_state: { error?: string, success?: boolean } | null | undefined, data: FormData) => {
    return await uploadPhoto(data);
  }, null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      e.target.form?.requestSubmit();
    }
  };

  return (
    <form action={action} style={{ marginBottom: 24 }}>
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="event_id" value={eventId} />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const droppedFile = event.dataTransfer.files[0];
          if (!droppedFile || !fileInputRef.current) return;
          const transfer = new DataTransfer();
          transfer.items.add(droppedFile);
          fileInputRef.current.files = transfer.files;
          fileInputRef.current.form?.requestSubmit();
        }}
        disabled={pending}
        style={{ 
          width: "100%",
          border: "2px dashed var(--border)", 
          borderRadius: 8, 
          padding: 32, 
          textAlign: "center",
          cursor: pending ? "wait" : "pointer",
          background: dragging ? "var(--green-soft)" : "rgba(0,0,0,0.02)",
          opacity: pending ? 0.5 : 1
        }}
      >
        <Upload size={32} color="var(--subtle)" style={{ marginBottom: 12 }} />
        <h4 style={{ marginBottom: 4 }}>Adicionar Foto</h4>
        <p className="subtle" style={{ fontSize: 13 }}>Clique ou arraste imagens (JPEG, PNG, WEBP, máx 5MB)</p>
      </button>

      <input 
        ref={fileInputRef}
        type="file" 
        name="file" 
        accept="image/jpeg, image/png, image/webp" 
        style={{ display: "none" }} 
        onChange={handleFileSelect}
        disabled={pending}
      />

      {state?.error && <div className="message error" style={{ marginTop: 12 }}>{state.error}</div>}
      {state && "success" in state && state.success && <div className="message success" style={{ marginTop: 12 }}>Foto adicionada.</div>}
    </form>
  );
}
