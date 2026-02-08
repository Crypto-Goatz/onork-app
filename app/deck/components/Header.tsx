"use client";

import { Ico } from "@/components/ui/Ico";
import { Dot } from "@/components/ui/Dot";
import { SERVICE_COUNT } from "@/lib/services";

interface HeaderProps {
  vaultCount: number;
  view: string;
  setView: (v: string) => void;
  onVaultOpen: () => void;
}

export function Header({ vaultCount, view, setView, onVaultOpen }: HeaderProps) {
  const buttons: [string, string, string][] = [
    ["history", "\uD83D\uDCCB", "#818cf8"],
    ["flows", "\u26A1", "#60a5fa"],
    ["vault", "\uD83D\uDD10", "#7c3aed"],
  ];

  return (
    <div
      className="flex items-center justify-between shrink-0 z-10"
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid #1e2258",
        background: "rgba(8,8,26,0.9)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="animate-breathe">
          <Ico name="onork" sz={30} />
        </div>
        <div>
          <div
            className="text-base font-black animate-shimmer"
            style={{
              letterSpacing: "-0.03em",
              background: "linear-gradient(90deg, #818cf8, #60a5fa)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            0nork
          </div>
          <div className="text-[9px] text-onork-text-muted flex items-center gap-1">
            <Dot on={vaultCount > 0} />
            {vaultCount}/{SERVICE_COUNT}
          </div>
        </div>
      </div>

      <div className="flex gap-[5px]">
        {buttons.map(([v, icon, color]) => (
          <button
            key={v}
            onClick={() => {
              if (v === "vault") onVaultOpen();
              setView(view === v ? "home" : v);
            }}
            className="cursor-pointer transition-all duration-150"
            style={{
              background: view === v ? color + "22" : "transparent",
              border: `1px solid ${view === v ? color + "44" : "#1e2258"}`,
              borderRadius: 8,
              padding: "5px 8px",
              color: "#f0f0ff",
              fontSize: 12,
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
