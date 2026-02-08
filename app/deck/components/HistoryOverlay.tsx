"use client";

import type { HistoryEntry } from "@/lib/hooks/useHistory";

interface HistoryOverlayProps {
  history: HistoryEntry[];
  onClose: () => void;
  onClear: () => void;
}

function typeIcon(type: string) {
  switch (type) {
    case "connect": return "\uD83D\uDD17";
    case "workflow": return "\u26A1";
    case "chat": return "\uD83D\uDCAC";
    default: return "\uD83D\uDCCC";
  }
}

function typeBg(type: string) {
  switch (type) {
    case "connect": return "#34d39918";
    case "workflow": return "#60a5fa18";
    case "chat": return "#7c3aed18";
    default: return "#7c3aed18";
  }
}

export function HistoryOverlay({ history, onClose, onClear }: HistoryOverlayProps) {
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
        <div className="text-[15px] font-bold text-onork-text">
          History{" "}
          <span className="text-[11px] text-onork-text-muted">{history.length}</span>
        </div>
        <div className="flex gap-2 items-center">
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="cursor-pointer"
              style={{
                background: "none",
                border: "1px solid #f8717133",
                borderRadius: 6,
                padding: "3px 8px",
                color: "#f87171",
                fontSize: 10,
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-none border-none text-onork-text-dim text-lg cursor-pointer"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3.5">
        {history.length === 0 ? (
          <div className="text-center py-9 text-onork-text-dim">
            <div className="text-4xl mb-1.5">&#x1F4CB;</div>
            <div className="text-sm font-semibold text-onork-text">No activity yet</div>
            <div className="text-xs mt-1">Actions and events will appear here</div>
          </div>
        ) : (
          history.map((e) => (
            <div
              key={e.id}
              className="flex gap-2.5 animate-slide-up"
              style={{ padding: "8px 0", borderBottom: "1px solid #1e225822" }}
            >
              <div
                className="flex items-center justify-center shrink-0 text-xs"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: typeBg(e.type),
                }}
              >
                {typeIcon(e.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-onork-text font-medium truncate">
                  {e.detail}
                </div>
                <div className="text-[9px] text-onork-text-muted mt-0.5">
                  {new Date(e.ts).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
