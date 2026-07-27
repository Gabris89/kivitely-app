"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
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

  // Portal to <body>: this dialog is used from inside .card panels all over
  // the app (issue/blocker/document/subcontractor delete confirmations), and
  // .card sets backdrop-filter, which - like transform/filter/contain -
  // gives its descendants a new containing block. Left un-ported, this
  // fixed-position backdrop would render pinned inside whichever .card
  // happens to be its nearest ancestor instead of covering the viewport.
  return createPortal(
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
    </div>,
    document.body
  );
}
