import { useEffect, useRef, useState } from "react";
import { ChevronDown, Building2, Plus, Check } from "lucide-react";
import type { SavedLocation } from "../lib/storage";

export function LocationSwitcher({
  locations,
  activeId,
  detectedId,
  onSelect,
  onAddNew,
}: {
  locations: SavedLocation[];
  activeId: string | null;
  detectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = locations.find((l) => l.id === activeId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const detectedIsKnown =
    detectedId && locations.some((l) => l.id === detectedId);
  const detectedIsUnknown = detectedId && !detectedIsKnown;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-[#484f58] rounded-lg px-3 py-1.5 text-sm font-medium text-[#e6edf3] transition-all duration-150 active:scale-[0.98] max-w-[260px]"
      >
        <Building2 className="w-4 h-4 text-[#6EE05A] flex-shrink-0" />
        <span className="truncate">{active ? active.name : "No location"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[320px] bg-[#1c2128] border border-[#30363d] rounded-xl shadow-lg shadow-black/40 z-30 animate-fade-up overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            {locations.length === 0 && (
              <div className="px-3 py-3 text-xs text-[#8b949e]">
                No locations saved yet. Add one to get started.
              </div>
            )}
            {locations.map((loc) => {
              const isActive = loc.id === activeId;
              const isDetected = loc.id === detectedId;
              return (
                <button
                  key={loc.id}
                  onClick={() => {
                    onSelect(loc.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors duration-150 ${
                    isActive
                      ? "bg-[#6EE05A]/10"
                      : "hover:bg-[#21262d]"
                  }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 mt-1 flex-shrink-0 ${
                      isActive ? "text-[#6EE05A]" : "text-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-[#6EE05A]" : "text-[#e6edf3]"
                        }`}
                      >
                        {loc.name}
                      </span>
                      {isDetected && (
                        <span className="bg-[#58a6ff]/10 text-[#58a6ff] text-[10px] font-medium px-1.5 py-0.5 rounded">
                          ON PAGE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8b949e] font-mono truncate">
                      {loc.id}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {detectedIsUnknown && (
            <div className="border-t border-[#30363d] px-3 py-2 bg-[#0d1117]">
              <div className="text-[11px] text-[#8b949e] mb-1.5">
                Detected on this page:
              </div>
              <div className="text-xs font-mono text-[#58a6ff] mb-1.5 truncate">
                {detectedId}
              </div>
              <button
                onClick={() => {
                  onAddNew();
                  setOpen(false);
                }}
                className="w-full text-xs text-[#6EE05A] hover:text-[#5bc74a] transition-colors"
              >
                Add this location →
              </button>
            </div>
          )}

          <div className="border-t border-[#30363d]">
            <button
              onClick={() => {
                onAddNew();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              Add location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
