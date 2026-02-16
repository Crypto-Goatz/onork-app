"use client";

import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<"success" | "error" | null>(null);

  if (!s) return null;

  const accentColor = s.c === "#e2e2e2" ? "#60a5fa" : s.c;

  // Sync credentials to 0nMCP server
  const syncToMCP = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      // Build credential description
      const creds = s.f
        .map((f) => {
          const val = get(serviceKey, f.k);
          if (val) return `${f.lb}: ${val}`;
          return null;
        })
        .filter(Boolean)
        .join(", ");

      if (!creds) {
        setSyncResult("error");
        return;
      }

      const res = await fetch("/api/0nmcp/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: `Connect to ${s.l} service with these credentials: ${creds}`,
        }),
      });

      if (res.ok) {
        setSyncResult("success");
        onHistory("sync", `Synced ${s.l} to 0nMCP`);
      } else {
        setSyncResult("error");
      }
    } catch {
      setSyncResult("error");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-onork-b2 hover:text-onork-p3 transition-colors cursor-pointer bg-transparent border-none p-0"
      >
        <ArrowLeft size={14} />
        All services
      </button>

      {/* Service header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center">
          <Ico name={s.logo} sz={28} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-xl text-onork-text">{s.l}</div>
          <div className="text-sm flex items-center gap-2 mt-0.5">
            <Dot on={isC} />
            <span className={isC ? "text-onork-green" : "text-onork-red"}>
              {isC ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="glass-card rounded-xl p-4 text-sm text-onork-text-dim leading-relaxed">
        {s.d}
      </div>

      {/* Sync to 0nMCP button */}
      {isC && (
        <button
          onClick={syncToMCP}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-onork-p1 to-onork-b1 hover:shadow-lg hover:shadow-onork-p1/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          {syncing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Syncing to 0nMCP...
            </>
          ) : syncResult === "success" ? (
            <>
              <CheckCircle2 size={16} />
              Synced to 0nMCP
            </>
          ) : syncResult === "error" ? (
            <>
              <XCircle size={16} />
              Sync failed — is 0nMCP running?
            </>
          ) : (
            <>
              Sync to 0nMCP
            </>
          )}
        </button>
      )}

      {/* Capabilities */}
      <div>
        <h4 className="text-xs text-onork-text-muted font-semibold tracking-wider uppercase mb-2.5">
          Capabilities ({s.cap.length})
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {s.cap.map((c) => (
            <span
              key={c}
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: accentColor + "14",
                border: `1px solid ${accentColor}25`,
                color: accentColor,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Credentials */}
      <div>
        <h4 className="text-xs text-onork-text-muted font-semibold tracking-wider uppercase mb-3">
          Credentials ({s.f.length})
        </h4>

        <div className="space-y-3">
          {s.f.map((f) => (
            <div
              key={f.k}
              className="glass-card rounded-xl p-4 transition-all duration-200"
              style={{
                borderColor: get(serviceKey, f.k)
                  ? accentColor + "30"
                  : undefined,
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-onork-text font-medium">{f.lb}</label>
                {f.s && (
                  <button
                    onClick={() => setShow((p) => ({ ...p, [f.k]: !p[f.k] }))}
                    className="flex items-center gap-1 text-xs text-onork-text-dim hover:text-onork-text transition-colors cursor-pointer bg-transparent border-none"
                  >
                    {show[f.k] ? <EyeOff size={12} /> : <Eye size={12} />}
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
                className="w-full h-10 px-3 rounded-lg bg-onork-bg border border-white/[0.08] text-sm text-onork-text font-mono placeholder:text-onork-text-muted outline-none focus-visible:ring-2 focus-visible:ring-onork-p2 ring-offset-2 ring-offset-onork-bg transition-all"
              />
              <p className="text-xs text-onork-text-muted mt-2">{f.h}</p>
              <a
                href={f.lk}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium no-underline mt-1.5 hover:underline"
                style={{ color: accentColor }}
              >
                <ExternalLink size={10} />
                {f.ll}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
