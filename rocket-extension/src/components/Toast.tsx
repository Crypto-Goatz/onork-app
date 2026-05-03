import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";
export type ToastMessage = {
  id: number;
  variant: ToastVariant;
  text: string;
};

const STYLES: Record<ToastVariant, string> = {
  success: "bg-[#6EE05A]/10 text-[#6EE05A] border-[#6EE05A]/20",
  error: "bg-[#f87171]/10 text-[#f87171] border-[#f87171]/20",
  info: "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/20",
};

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed top-2 right-2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  const Icon = ICONS[toast.variant];
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);
  return (
    <div
      className={`pointer-events-auto flex items-start gap-2 border rounded-lg px-3 py-2 text-xs animate-fade-up max-w-[360px] ${STYLES[toast.variant]}`}
    >
      <Icon className="w-4 h-4 mt-[1px] flex-shrink-0" />
      <span className="flex-1 break-words">{toast.text}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const push = (variant: ToastVariant, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, variant, text }]);
  };
  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));
  return {
    toasts,
    dismiss,
    success: (t: string) => push("success", t),
    error: (t: string) => push("error", t),
    info: (t: string) => push("info", t),
  };
}
