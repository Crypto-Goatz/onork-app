import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  removeLocation,
  saveLocation,
  setActiveLocation,
  type SavedLocation,
  maskToken,
} from "../lib/storage";
import { crm } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

type PingState = "idle" | "checking" | "ok" | "error";

export function Settings({
  locations,
  activeId,
  detectedId,
  onChange,
  toast,
}: {
  locations: SavedLocation[];
  activeId: string | null;
  detectedId: string | null;
  onChange: () => void | Promise<void>;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [name, setName] = useState("");
  const [locId, setLocId] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pingStates, setPingStates] = useState<Record<string, PingState>>({});

  // Pre-fill the location ID if detected on the current page and not yet saved.
  useEffect(() => {
    if (detectedId && !locations.some((l) => l.id === detectedId)) {
      setLocId((prev) => prev || detectedId);
    }
  }, [detectedId, locations]);

  const handleSave = async () => {
    if (!name.trim() || !locId.trim() || !token.trim()) {
      toast("error", "Name, location ID, and token are required.");
      return;
    }
    setSaving(true);
    try {
      await saveLocation({
        id: locId.trim(),
        name: name.trim(),
        pitToken: token.trim(),
      });
      toast("success", `Saved "${name.trim()}"`);
      setName("");
      setLocId("");
      setToken("");
      await onChange();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (loc: SavedLocation) => {
    if (!confirm(`Remove "${loc.name}"? This cannot be undone.`)) return;
    await removeLocation(loc.id);
    toast("success", `Removed "${loc.name}"`);
    await onChange();
  };

  const handlePing = async (loc: SavedLocation) => {
    setPingStates((s) => ({ ...s, [loc.id]: "checking" }));
    const ok = await crm.ping(loc.id);
    setPingStates((s) => ({ ...s, [loc.id]: ok ? "ok" : "error" }));
    toast(
      ok ? "success" : "error",
      ok ? `${loc.name} reachable` : `${loc.name} unreachable — check token`,
    );
  };

  const handleSetActive = async (loc: SavedLocation) => {
    await setActiveLocation(loc.id);
    await onChange();
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#6EE05A]" />
          <h3 className="text-sm font-medium text-[#e6edf3]">Add Location</h3>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-[#8b949e] mb-1 block">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Spa In Ligonier"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#8b949e] mb-1 block">
              Location ID
            </label>
            <input
              value={locId}
              onChange={(e) => setLocId(e.target.value)}
              placeholder="AeY8M0GNOuJPNkLQ7AAC"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs font-mono text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
            />
            {detectedId && detectedId !== locId && (
              <button
                onClick={() => setLocId(detectedId)}
                className="text-[10px] text-[#58a6ff] hover:text-[#6EE05A] transition-colors mt-1"
              >
                Use detected: {detectedId}
              </button>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-[#8b949e] mb-1 block">
              PIT token (type:plain)
            </label>
            <div className="relative">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type={showToken ? "text" : "password"}
                placeholder="pit-…"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-3 pr-9 py-1.5 text-xs font-mono text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3] p-1"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2 text-sm hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Save location
          </button>
        </div>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#6EE05A]" />
          <h3 className="text-sm font-medium text-[#e6edf3]">Saved Locations</h3>
          <span className="text-xs text-[#8b949e]">{locations.length}</span>
        </div>

        {locations.length === 0 ? (
          <div className="text-xs text-[#8b949e] py-3 text-center">
            None yet. Add one above.
          </div>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) => {
              const ping = pingStates[loc.id] ?? "idle";
              const isActive = loc.id === activeId;
              return (
                <div
                  key={loc.id}
                  className={`bg-[#0d1117] border rounded-lg p-2.5 space-y-1.5 transition-colors duration-150 ${
                    isActive
                      ? "border-[#6EE05A]/40 bg-[#6EE05A]/5"
                      : "border-[#30363d] hover:border-[#484f58]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#e6edf3] truncate flex items-center gap-1.5">
                        {loc.name}
                        {isActive && (
                          <span className="bg-[#6EE05A]/10 text-[#6EE05A] text-[9px] font-medium px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#8b949e] font-mono truncate">
                        {loc.id}
                      </div>
                    </div>
                    <button
                      onClick={() => void handleRemove(loc)}
                      className="text-[#8b949e] hover:text-[#f87171] transition-colors duration-150 flex-shrink-0"
                      aria-label={`Remove ${loc.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e] font-mono">
                    <KeyRound className="w-3 h-3" />
                    {maskToken(loc.pitToken)}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {!isActive && (
                      <button
                        onClick={() => void handleSetActive(loc)}
                        className="text-[10px] text-[#58a6ff] hover:text-[#6EE05A] transition-colors"
                      >
                        Set active
                      </button>
                    )}
                    <button
                      onClick={() => void handlePing(loc)}
                      disabled={ping === "checking"}
                      className="ml-auto flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                    >
                      {ping === "checking" && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {ping === "ok" && (
                        <CheckCircle2 className="w-3 h-3 text-[#6EE05A]" />
                      )}
                      {ping === "error" && (
                        <AlertTriangle className="w-3 h-3 text-[#f87171]" />
                      )}
                      {ping === "idle" && "Test"}
                      {ping === "checking" && "Pinging…"}
                      {ping === "ok" && "Reachable"}
                      {ping === "error" && "Failed"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
