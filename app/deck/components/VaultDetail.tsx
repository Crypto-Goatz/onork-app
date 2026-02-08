"use client";

import { useState } from "react";
import { SVC } from "@/lib/services";
import { Ico } from "@/components/ui/Ico";
import { Dot } from "@/components/ui/Dot";

interface VaultDetailProps {
  serviceKey: string;
  isC: boolean;
  get: (service: string, key: string) => string;
  set: (service: string, key: string, value: string) => void;
  onBack: () => void;
  onConfirmModal: (config: {
    title: string;
    body: string;
    onConfirm: () => void;
  }) => void;
  onHistory: (type: string, detail: string) => void;
}

export function VaultDetail({
  serviceKey,
  isC,
  get,
  set,
  onBack,
  onConfirmModal,
  onHistory,
}: VaultDetailProps) {
  const s = SVC[serviceKey];
  const [show, setShow] = useState<Record<string, boolean>>({});

  if (!s) return null;

  const accentColor = s.c === "#e2e2e2" ? "#60a5fa" : s.c;

  return (
    <div className="animate-slide-up">
      <button
        onClick={onBack}
        className="bg-none border-none text-onork-b2 text-xs cursor-pointer mb-3.5 p-0"
      >
        &larr; Back to all services
      </button>

      <div className="flex items-center gap-3 mb-3.5">
        <Ico name={s.logo} sz={34} />
        <div className="flex-1">
          <div className="font-bold text-[17px] text-onork-text">{s.l}</div>
          <div className="text-[11px] flex items-center gap-[5px]">
            <Dot on={isC} />
            <span style={{ color: isC ? "#34d399" : "#f87171" }}>
              {isC ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        className="text-xs text-onork-text-dim leading-relaxed mb-4"
        style={{
          padding: "10px 12px",
          background: "#12143a",
          borderRadius: 10,
          border: "1px solid #1e2258",
        }}
      >
        {s.d}
      </div>

      {/* Capabilities */}
      <div className="mb-[18px]">
        <div className="text-[9px] text-onork-text-muted font-extrabold tracking-[0.1em] uppercase mb-2">
          Capabilities ({s.cap.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {s.cap.map((c) => (
            <span
              key={c}
              className="text-[10px] font-medium"
              style={{
                padding: "3px 10px",
                borderRadius: 16,
                background: accentColor + "14",
                border: `1px solid ${accentColor}30`,
                color: accentColor,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Credentials */}
      <div className="text-[9px] text-onork-text-muted font-extrabold tracking-[0.1em] uppercase mb-2.5">
        Credentials ({s.f.length})
      </div>

      {s.f.map((f) => (
        <div
          key={f.k}
          className="mb-3 transition-colors duration-200"
          style={{
            padding: "12px 14px",
            background: "#12143a",
            borderRadius: 12,
            border: `1px solid ${get(serviceKey, f.k) ? accentColor + "30" : "#1e2258"}`,
          }}
        >
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] text-onork-text font-semibold">{f.lb}</label>
            {f.s && (
              <button
                onClick={() => setShow((p) => ({ ...p, [f.k]: !p[f.k] }))}
                className="bg-none border-none text-onork-text-dim text-[10px] cursor-pointer"
              >
                {show[f.k] ? "Hide" : "Show"}
              </button>
            )}
          </div>
          <input
            type={f.s && !show[f.k] ? "password" : "text"}
            value={get(serviceKey, f.k)}
            onChange={(e) => {
              const val = e.target.value;
              const prev = get(serviceKey, f.k);
              if (!prev && val && f.s) {
                onConfirmModal({
                  title: `Connect ${s.l}?`,
                  body: `You're adding a ${f.lb} for ${s.l}. This credential will be saved in your browser's local storage.`,
                  onConfirm: () => {
                    set(serviceKey, f.k, val);
                    onHistory("connect", `Added ${f.lb} for ${s.l}`);
                  },
                });
              } else {
                set(serviceKey, f.k, val);
              }
            }}
            placeholder={f.ph}
            className="w-full outline-none text-onork-text"
            style={{
              background: "#08081a",
              border: "1px solid #1e2258",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f166")}
            onBlur={(e) => (e.target.style.borderColor = "#1e2258")}
          />
          <div className="text-[10px] text-onork-text-muted mt-[5px]">{f.h}</div>
          <a
            href={f.lk}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-medium no-underline mt-1"
            style={{ color: accentColor }}
          >
            &nearr; {f.ll}
          </a>
        </div>
      ))}
    </div>
  );
}
