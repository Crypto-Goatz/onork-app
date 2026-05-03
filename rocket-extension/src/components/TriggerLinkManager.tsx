import { useEffect, useState } from "react";
import { Plus, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import { crm, CrmApiError, type TriggerLink } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

export function TriggerLinkManager({
  location,
  toast,
}: {
  location: SavedLocation;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [links, setLinks] = useState<TriggerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [redirect, setRedirect] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await crm.listTriggerLinks(location.id);
      setLinks(list);
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

  const handleCreate = async () => {
    if (!name.trim() || !redirect.trim()) return;
    setCreating(true);
    try {
      await crm.createTriggerLink(location.id, {
        name: name.trim(),
        redirectTo: redirect.trim(),
      });
      toast("success", `Created "${name.trim()}"`);
      setName("");
      setRedirect("");
      void load();
    } catch (err) {
      toast("error", err instanceof CrmApiError ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <LinkIcon className="w-4 h-4 text-[#6EE05A]" />
        <h3 className="text-sm font-medium text-[#e6edf3]">Trigger Links</h3>
        <span className="text-xs text-[#8b949e]">
          {loading ? "—" : links.length}
        </span>
      </div>

      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Link name"
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
        />
        <div className="flex gap-2">
          <input
            value={redirect}
            onChange={(e) => setRedirect(e.target.value)}
            placeholder="https://destination.com"
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !redirect.trim()}
            className="bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-3 py-1.5 text-xs hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Create
          </button>
        </div>
      </div>

      <div className="max-h-[160px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="h-7 bg-[#0d1117] rounded animate-pulse" />
        ) : links.length === 0 ? (
          <div className="text-xs text-[#8b949e] py-2 text-center">
            No trigger links.
          </div>
        ) : (
          links.map((l) => (
            <a
              key={l.id}
              href={l.redirectTo}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 hover:border-[#484f58] hover:bg-[#1c2128] transition-all duration-150"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#e6edf3] truncate">
                  {l.name}
                </div>
                <div className="text-[10px] text-[#8b949e] truncate">
                  {l.redirectTo}
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
