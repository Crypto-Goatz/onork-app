import { useState } from "react";
import { Palette, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import { crm, CrmApiError } from "../lib/crm-api";
import { build0nThemeStylesheet } from "../styles/design-tokens";
import type { ToastVariant } from "../components/Toast";

type State = "idle" | "applying" | "applied" | "error";

export function ApplyThemeCard({
  location,
  toast,
}: {
  location: SavedLocation;
  toast: (v: ToastVariant, m: string) => void;
}) {
  const [state, setState] = useState<State>("idle");

  const apply = async () => {
    setState("applying");
    try {
      await crm.applyCustomCss(location.id, build0nThemeStylesheet());
      setState("applied");
      toast("success", `0n theme applied to ${location.name}`);
    } catch (err) {
      setState("error");
      toast("error", err instanceof CrmApiError ? err.message : String(err));
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-[#6EE05A]" />
        <h3 className="text-sm font-medium text-[#e6edf3]">Apply 0n Theme</h3>
        {state === "applied" && (
          <span className="bg-[#6EE05A]/10 text-[#6EE05A] text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            APPLIED
          </span>
        )}
      </div>
      <p className="text-xs text-[#8b949e]">
        Pushes the 0n design tokens (bg #0d1117, accent #6EE05A, Inter) into{" "}
        <span className="text-[#c9d1d9]">{location.name}</span> as global custom
        CSS so every CRM-built page inherits the dark theme automatically.
      </p>
      <button
        onClick={() => void apply()}
        disabled={state === "applying"}
        className="w-full bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2 text-sm hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {state === "applying" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : state === "error" ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Palette className="w-4 h-4" />
        )}
        {state === "applied" ? "Apply again" : "Apply theme"}
      </button>
      <p className="text-[10px] text-[#8b949e]">
        This writes to the location's <code className="font-mono text-[#c9d1d9]">customCss</code>{" "}
        field. If your CRM tenant uses a different field, the call will surface
        the error.
      </p>
    </div>
  );
}
