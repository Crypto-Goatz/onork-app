"use client";

import { useState } from "react";
import { Search, Lock } from "lucide-react";
import { SVC, SERVICE_COUNT } from "@/lib/services";
import { Ico } from "@/components/ui/Ico";
import { Dot } from "@/components/ui/Dot";

interface VaultOverlayProps {
  isC: (service: string) => boolean;
  vaultCount: number;
  onSelectService: (key: string) => void;
}

export function VaultOverlay({
  isC,
  vaultCount,
  onSelectService,
}: VaultOverlayProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "connected" | "setup">("all");

  const entries = Object.entries(SVC).filter(([k, s]) => {
    const matchesSearch =
      !search ||
      s.l.toLowerCase().includes(search.toLowerCase()) ||
      s.d.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "connected" && isC(k)) ||
      (filter === "setup" && !isC(k));
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-onork-text">Service Vault</h2>
          <p className="text-sm text-onork-text-dim mt-0.5">
            {vaultCount}/{SERVICE_COUNT} services connected
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-onork-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-onork-text placeholder:text-onork-text-muted outline-none focus-visible:ring-2 focus-visible:ring-onork-p2 ring-offset-2 ring-offset-onork-bg transition-all w-48"
            />
          </div>
          <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
            {(["all", "connected", "setup"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer capitalize ${
                  filter === f
                    ? "bg-onork-p1/20 text-onork-p3"
                    : "text-onork-text-dim hover:text-onork-text"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {entries.map(([k, s], i) => {
          const cn = isC(k);
          const accentColor = s.c === "#e2e2e2" ? "#60a5fa" : s.c;
          return (
            <button
              key={k}
              onClick={() => onSelectService(k)}
              className="glass-card gradient-border rounded-2xl p-4 text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-onork-p1/5 group animate-stagger-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <Ico name={s.logo} sz={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-onork-text truncate">{s.l}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Dot on={cn} />
                    <span className={`text-[11px] ${cn ? "text-onork-green" : "text-onork-text-muted"}`}>
                      {cn ? "Connected" : "Setup required"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-onork-text-dim leading-relaxed line-clamp-2 mb-3">
                {s.d.split(".")[0]}.
              </p>

              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] font-medium"
                  style={{ color: accentColor }}
                >
                  {s.cap.length} capabilities
                </span>
                <span className="text-[11px] text-onork-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  Configure &rarr;
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-16">
          <Lock size={24} className="text-onork-text-muted mx-auto mb-3" />
          <p className="text-sm text-onork-text-dim">No services match your search</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[11px] text-onork-text-muted mt-6 py-3 border-t border-white/[0.06]">
        Credentials encrypted in browser &middot; Clears on wipe
      </div>
    </div>
  );
}
