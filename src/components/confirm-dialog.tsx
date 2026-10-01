"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  formId?: string;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pending = false,
  formId,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <button
          type="button"
          className="confirm-dialog-close"
          aria-label="Fechar"
          disabled={pending}
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle size={24} />
        </div>

        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-cancel"
            disabled={pending}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type={formId ? "submit" : "button"}
            form={formId}
            className="confirm-dialog-confirm"
            disabled={pending}
            onClick={() => {
              if (formId) {
                onClose();
                return;
              }
              void onConfirm?.();
            }}
          >
            {pending ? "Processando..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
