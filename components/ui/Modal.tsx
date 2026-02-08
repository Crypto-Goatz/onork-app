"use client";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-5 animate-fade-in"
      style={{ background: "rgba(5,5,20,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="bg-onork-surface border border-onork-border rounded-2xl p-6 max-w-[360px] w-full animate-modal-pop">
        <div className="text-base font-bold text-onork-text mb-3">{title}</div>
        <div className="text-[13px] text-onork-text-dim leading-relaxed mb-5">
          {children}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-[10px] border border-onork-border bg-transparent text-onork-text-dim text-[13px] font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-[10px] border-none text-white text-[13px] font-bold cursor-pointer"
            style={{
              background: danger ? "#f87171" : "linear-gradient(135deg, #7c3aed, #3b82f6)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
