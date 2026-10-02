"use client";

import { useRef, useState, useTransition } from "react";
import { uploadSessionPhoto } from "./actions";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { compressImage } from "@/lib/utils/image-compression";

export function SessionGalleryUploader({ storeId, sessionId }: { storeId: string; sessionId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleProcessFile = async (rawFile: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCompressing(true);

    try {
      const compressedFile = await compressImage(rawFile);
      setIsCompressing(false);

      const formData = new FormData();
      formData.append("store_id", storeId);
      formData.append("session_id", sessionId);
      formData.append("file", compressedFile);

      startTransition(async () => {
        const res = await uploadSessionPhoto(formData);
        if (res?.error) {
          setErrorMessage(res.error);
        } else {
          setSuccessMessage("Foto otimizada e adicionada à sessão!");
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      });
    } catch {
      setIsCompressing(false);
      setErrorMessage("Erro ao processar imagem.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const isBusy = isCompressing || isPending;

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const droppedFile = event.dataTransfer.files[0];
          if (droppedFile && !isBusy) {
            handleProcessFile(droppedFile);
          }
        }}
        disabled={isBusy}
        style={{
          width: "100%",
          border: "2px dashed var(--border)",
          borderRadius: 8,
          padding: 28,
          textAlign: "center",
          cursor: isBusy ? "wait" : "pointer",
          background: dragging ? "var(--green-soft)" : "rgba(0,0,0,0.02)",
          opacity: isBusy ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
      >
        {isBusy ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Loader2 className="animate-spin" size={32} color="var(--brand)" />
            <h4 style={{ margin: 0 }}>
              {isCompressing ? "Compactando e otimizando imagem..." : "Enviando para a galeria da sessão..."}
            </h4>
            <p className="subtle" style={{ fontSize: 13, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <Sparkles size={14} color="#0f766e" /> Reduzindo tamanho sem perder qualidade...
            </p>
          </div>
        ) : (
          <>
            <Upload size={32} color="var(--subtle)" style={{ marginBottom: 12 }} />
            <h4 style={{ marginBottom: 4 }}>Adicionar Foto da Sessão</h4>
            <p className="subtle" style={{ fontSize: 13 }}>
              Clique ou arraste imagens (JPEG, PNG, WEBP). As fotos são <strong>compactadas automaticamente</strong>.
            </p>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg, image/png, image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
        disabled={isBusy}
      />

      {errorMessage && <div className="message error" style={{ marginTop: 12 }}>⚠️ {errorMessage}</div>}
      {successMessage && <div className="message success" style={{ marginTop: 12 }}>✨ {successMessage}</div>}
    </div>
  );
}
