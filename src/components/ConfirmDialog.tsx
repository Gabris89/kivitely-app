"use client";

import type { ReactNode } from "react";
import { CloseIcon, TrashIcon } from "@/components/ActionIcons";

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel = "Törlés", onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="card confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onCancel}>
            <CloseIcon />
            Mégse
          </button>
          <button type="button" className="button danger" onClick={onConfirm}>
            <TrashIcon />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
