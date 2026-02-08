"use client";

import { SVC } from "@/lib/services";
import { Ico } from "@/components/ui/Ico";

interface ServiceStripProps {
  isC: (service: string) => boolean;
  onServiceClick: (key: string) => void;
}

export function ServiceStrip({ isC, onServiceClick }: ServiceStripProps) {
  return (
    <div className="shrink-0" style={{ padding: "10px 12px 6px", borderBottom: "1px solid #1e2258" }}>
      <div className="text-[8px] text-onork-text-muted mb-1.5 font-extrabold tracking-[0.12em] uppercase">
        Services
      </div>
      <div className="flex gap-1 overflow-auto pb-1">
        {Object.entries(SVC).map(([k, s]) => {
          const connected = isC(k);
          const accentColor = s.c === "#e2e2e2" ? "#6366f1" : s.c;
          return (
            <button
              key={k}
              onClick={() => onServiceClick(k)}
              className="cursor-pointer transition-all duration-150 shrink-0 text-center"
              style={{
                background: connected ? accentColor + "12" : "#12143a",
                border: `1px solid ${connected ? accentColor + "25" : "#1e2258"}`,
                borderRadius: 8,
                padding: "8px 4px 6px",
                minWidth: 48,
              }}
            >
              <div className="flex justify-center mb-0.5">
                <Ico name={s.logo} sz={20} />
              </div>
              <div className="text-[8px] text-onork-text font-semibold leading-tight whitespace-nowrap">
                {s.l}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
