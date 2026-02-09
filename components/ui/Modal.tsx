"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function Modal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  danger,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-5 animate-fade-in"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-onork-bg/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative glass rounded-2xl p-6 max-w-md w-full animate-scale-in shadow-2xl shadow-onork-p1/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-onork-text mb-2">{title}</h3>
        <p className="text-sm text-onork-text-dim leading-relaxed mb-6">
          {children}
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-white/[0.08] bg-transparent text-onork-text-dim text-sm font-medium cursor-pointer hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-10 rounded-xl border-none text-white text-sm font-semibold cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] ${
              danger
                ? "bg-onork-red hover:shadow-onork-red/20"
                : "bg-gradient-to-r from-onork-p1 to-onork-b1 hover:shadow-onork-p1/20"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
