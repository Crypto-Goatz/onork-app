"use client";

import type { Workflow } from "@/lib/hooks/useFlows";

interface FlowsOverlayProps {
  flows: Workflow[];
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (flow: Workflow) => void;
  onNewFlow: () => void;
  onHistory: (type: string, detail: string) => void;
}

export function FlowsOverlay({
  flows,
  onClose,
  onToggle,
  onDelete,
  onNewFlow,
  onHistory,
}: FlowsOverlayProps) {
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
          Workflows{" "}
          <span className="text-[11px] text-onork-text-muted">{flows.length}</span>
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
        {flows.length === 0 ? (
          <div className="text-center py-9 text-onork-text-dim">
            <div className="text-4xl mb-1.5">&#x26A1;</div>
            <div className="text-sm font-semibold text-onork-text">No workflows yet</div>
            <div className="text-xs mt-1">Build your first automation</div>
          </div>
        ) : (
          flows.map((f) => (
            <div
              key={f.id}
              className="mb-1.5"
              style={{
                background: "#12143a",
                border: `1px solid ${f.on ? "#60a5fa30" : "#1e2258"}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div className="flex justify-between items-center mb-[5px]">
                <span className="font-semibold text-[13px] text-onork-text">{f.name}</span>
                <div className="flex gap-[5px]">
                  <button
                    onClick={() => {
                      onToggle(f.id);
                      onHistory("workflow", `Toggled "${f.name}" ${f.on ? "off" : "on"}`);
                    }}
                    className="cursor-pointer font-bold"
                    style={{
                      padding: "2px 8px",
                      borderRadius: 14,
                      border: "none",
                      fontSize: 9,
                      background: f.on ? "#34d39922" : "#12143a",
                      color: f.on ? "#34d399" : "#505880",
                    }}
                  >
                    {f.on ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => onDelete(f)}
                    className="cursor-pointer"
                    style={{
                      padding: "2px 6px",
                      borderRadius: 6,
                      border: "none",
                      background: "#f8717118",
                      color: "#f87171",
                      fontSize: 9,
                    }}
                  >
                    &#x2715;
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-onork-b2">&#x26A1; {f.trigger}</div>
              {f.actions.map((a, i) => (
                <div key={i} className="text-[11px] text-onork-text-dim pl-2.5 mt-px">
                  &rarr; {a}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #1e2258" }}>
        <button
          onClick={onNewFlow}
          className="w-full cursor-pointer font-bold text-onork-b2"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #7c3aed22, #3b82f622)",
            fontSize: 13,
          }}
        >
          + New Workflow
        </button>
      </div>
    </div>
  );
}
