"use client";

import { SVC, SERVICE_COUNT } from "@/lib/services";
import { Ico } from "@/components/ui/Ico";
import { Dot } from "@/components/ui/Dot";

interface VaultOverlayProps {
  isC: (service: string) => boolean;
  vaultCount: number;
  activeSvc: string | null;
  onClose: () => void;
  onSelectService: (key: string) => void;
  children?: React.ReactNode; // VaultDetail when activeSvc is set
}

export function VaultOverlay({
  isC,
  vaultCount,
  activeSvc,
  onClose,
  onSelectService,
  children,
}: VaultOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col animate-slide-up"
      style={{
        background: "rgba(8,8,26,0.97)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center"
        style={{ padding: "14px 18px", borderBottom: "1px solid #1e2258" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-bold text-onork-text">
            Vault
          </span>
          <span className="text-[11px] text-onork-text-muted">
            {vaultCount}/{SERVICE_COUNT}
          </span>
        </div>
        <button
          onClick={onClose}
          className="bg-none border-none text-onork-text-dim text-lg cursor-pointer"
        >
          &#x2715;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3.5">
        {activeSvc ? (
          children
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(SVC).map(([k, s]) => {
              const cn = isC(k);
              const accentColor = s.c === "#e2e2e2" ? "#60a5fa" : s.c;
              return (
                <button
                  key={k}
                  onClick={() => onSelectService(k)}
                  className="text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "#12143a",
                    border: `1px solid ${cn ? accentColor + "30" : "#1e2258"}`,
                    borderRadius: 10,
                    padding: "12px 10px",
                  }}
                >
                  <div className="flex items-center gap-[7px] mb-1.5">
                    <Ico name={s.logo} sz={22} />
                    <span className="font-semibold text-xs text-onork-text">{s.l}</span>
                  </div>
                  <div
                    className="text-[10px] text-onork-text-dim leading-tight mb-[5px]"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {s.d.split(".")[0]}.
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-[3px] text-[9px] text-onork-text-dim">
                      <Dot on={cn} />
                      {cn ? "Live" : "Setup"}
                    </span>
                    <span
                      className="text-[8px] font-bold"
                      style={{ color: accentColor }}
                    >
                      {s.cap.length} tools
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="text-center text-[8px] text-onork-text-muted"
        style={{ padding: "8px 14px", borderTop: "1px solid #1e2258" }}
      >
        Encrypted in browser &middot; Clears on wipe
      </div>
    </div>
  );
}
