import { useEffect, useState } from "react";
import { GitBranch, Loader2, RefreshCw } from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import { crm, CrmApiError, type Workflow } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

export function WorkflowList({
  location,
  toast,
}: {
  location: SavedLocation;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [items, setItems] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await crm.listWorkflows(location.id);
      setItems(list);
    } catch (err) {
      toast("error", err instanceof CrmApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id]);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-[#6EE05A]" />
        <h3 className="text-sm font-medium text-[#e6edf3]">Workflows</h3>
        <span className="text-xs text-[#8b949e]">
          {loading ? "—" : items.length}
        </span>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded p-1 transition-all duration-150"
          aria-label="Refresh workflows"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="space-y-1">
            <div className="h-7 bg-[#0d1117] rounded animate-pulse" />
            <div className="h-7 bg-[#0d1117] rounded animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-xs text-[#8b949e] py-2 text-center">
            No workflows.
          </div>
        ) : (
          items.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5"
            >
              <span className="text-xs text-[#c9d1d9] truncate">{w.name}</span>
              {w.status && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
                    w.status.toLowerCase() === "published"
                      ? "bg-[#6EE05A]/10 text-[#6EE05A]"
                      : "bg-[#fbbf24]/10 text-[#fbbf24]"
                  }`}
                >
                  {w.status}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
