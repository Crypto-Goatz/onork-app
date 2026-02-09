"use client";

import { Workflow, Zap, Trash2, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Workflow as WorkflowType } from "@/lib/hooks/useFlows";

interface FlowsOverlayProps {
  flows: WorkflowType[];
  onToggle: (id: string) => void;
  onDelete: (flow: WorkflowType) => void;
  onNewFlow: () => void;
  onHistory: (type: string, detail: string) => void;
}

export function FlowsOverlay({
  flows,
  onToggle,
  onDelete,
  onNewFlow,
  onHistory,
}: FlowsOverlayProps) {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-onork-text">Workflows</h2>
          <p className="text-sm text-onork-text-dim mt-0.5">
            {flows.length} workflow{flows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onNewFlow}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-onork-p1 to-onork-b1 hover:shadow-lg hover:shadow-onork-p1/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={16} />
          New Workflow
        </button>
      </div>

      {/* Content */}
      {flows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No workflows yet"
          description="Build your first automation to connect services and trigger actions automatically."
          action={{ label: "Create Workflow", onClick: onNewFlow }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {flows.map((f, i) => (
            <div
              key={f.id}
              className="glass-card rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-onork-p1/5 animate-stagger-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    f.on ? "bg-onork-b1/15" : "bg-white/[0.04]"
                  }`}>
                    <Zap size={16} className={f.on ? "text-onork-b2" : "text-onork-text-muted"} />
                  </div>
                  <span className="font-semibold text-sm text-onork-text truncate">{f.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onToggle(f.id);
                      onHistory("workflow", `Toggled "${f.name}" ${f.on ? "off" : "on"}`);
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer border-none ${
                      f.on
                        ? "bg-onork-green/15 text-onork-green"
                        : "bg-white/[0.04] text-onork-text-muted"
                    }`}
                  >
                    {f.on ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => onDelete(f)}
                    className="p-1.5 rounded-lg text-onork-text-muted hover:text-onork-red hover:bg-onork-red/10 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 ml-[46px]">
                <div className="text-xs text-onork-b2 flex items-center gap-1.5">
                  <Zap size={10} />
                  {f.trigger}
                </div>
                {f.actions.map((a, idx) => (
                  <div key={idx} className="text-xs text-onork-text-dim pl-3 border-l border-white/[0.06]">
                    {a}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
