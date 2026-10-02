"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash } from "lucide-react";
import { deleteSessionPhoto } from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function SessionPhotoItem({
  photo,
  storeId,
  sessionId,
  isAdmin,
}: {
  photo: { id: string; storage_path: string; url: string };
  storeId: string;
  sessionId: string;
  isAdmin: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const deleteFormId = `delete-session-photo-${photo.id}`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "#000",
        aspectRatio: "4 / 3",
      }}
    >
      {/* Imagem clicável para zoom */}
      <div
        onClick={() => setPreviewOpen(true)}
        style={{ cursor: "pointer", width: "100%", height: "100%", position: "relative" }}
      >
        <Image
          src={photo.url}
          alt="Foto da sessão"
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* Botão de exclusão para administradores */}
      {isAdmin && (
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            style={{
              backgroundColor: "rgba(220, 38, 38, 0.9)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
            title="Excluir foto"
          >
            <Trash size={16} />
          </button>
        </div>
      )}

      {/* Modal / Overlay de Zoom */}
      {previewOpen && (
        <div
          onClick={() => setPreviewOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", width: "100%", height: "100%" }}>
            <Image
              src={photo.url}
              alt="Foto ampliada da sessão"
              fill
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      {/* Form & Confirm Dialog de Exclusão */}
      <form id={deleteFormId} action={async (formData) => { await deleteSessionPhoto(formData); }}>
        <input type="hidden" name="store_id" value={storeId} />
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="photo_id" value={photo.id} />
      </form>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir Foto da Sessão?"
        description="Esta foto será removida permanentemente da galeria desta sessão."
        confirmLabel="Excluir"
        formId={deleteFormId}
      />
    </div>
  );
}
