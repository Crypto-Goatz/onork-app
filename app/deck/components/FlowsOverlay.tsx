"use client";

import { useEffect, useState } from "react";
import { Workflow, Zap, Trash2, Plus, Play, Loader2, Server } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Workflow as WorkflowType } from "@/lib/hooks/useFlows";

interface McpWorkflow {
  name: string;
  path: string;
  type?: string;
  version?: string;
}

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
  const [mcpWorkflows, setMcpWorkflows] = useState<McpWorkflow[]>([]);
  const [loadingMcp, setLoadingMcp] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);

  // Load workflows from 0nMCP
  useEffect(() => {
    fetch("/api/0nmcp/workflows")
      .then((r) => r.json())
      .then((data) => setMcpWorkflows(data.workflows || []))
      .catch(() => {})
      .finally(() => setLoadingMcp(false));
  }, []);

  const runWorkflow = async (name: string) => {
    setRunningId(name);
    setRunResult(null);
    onHistory("workflow", `Running workflow: ${name}`);
    try {
      const res = await fetch("/api/0nmcp/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: name }),
      });
      const data = await res.json();
      setRunResult(
        data.status === "completed"
          ? `Completed in ${data.duration_ms || 0}ms (${data.steps_executed || 0} steps)`
          : `Failed: ${data.message || "Unknown error"}`
      );
      onHistory("workflow", `Workflow "${name}": ${data.status}`);
    } catch {
      setRunResult("Failed to reach 0nMCP server");
    } finally {
      setRunningId(null);
      setTimeout(() => setRunResult(null), 5000);
    }
  };

  const totalFlows = flows.length + mcpWorkflows.length;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-onork-text">Workflows</h2>
          <p className="text-sm text-onork-text-dim mt-0.5">
            {totalFlows} workflow{totalFlows !== 1 ? "s" : ""}
            {mcpWorkflows.length > 0 && (
              <span className="text-onork-p3 ml-1">
                ({mcpWorkflows.length} from 0nMCP)
              </span>
            )}
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

      {/* Run result banner */}
      {runResult && (
        <div className="mb-4 px-4 py-3 rounded-xl glass-card border border-onork-p1/20 text-sm text-onork-text-dim animate-fade-in">
          {runResult}
        </div>
      )}

      {/* Content */}
      {totalFlows === 0 && !loadingMcp ? (
        <EmptyState
          icon={Workflow}
          title="No workflows yet"
          description="Build your first automation to connect services and trigger actions automatically. You can also create .0n workflow files in ~/.0n/workflows/"
          action={{ label: "Create Workflow", onClick: onNewFlow }}
        />
      ) : (
        <div className="space-y-6">
          {/* 0nMCP Workflows */}
          {(mcpWorkflows.length > 0 || loadingMcp) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Server size={14} className="text-onork-p3" />
                <h3 className="text-sm font-semibold text-onork-text">0nMCP Workflows</h3>
                <span className="text-xs text-onork-text-muted">~/.0n/workflows/</span>
              </div>

              {loadingMcp ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-onork-p3" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mcpWorkflows.map((w, i) => (
                    <div
                      key={w.name}
                      className="glass-card rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-onork-p1/5 animate-stagger-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-onork-p1/15">
                            <Zap size={16} className="text-onork-p3" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-sm text-onork-text truncate block">
                              {w.name}
                            </span>
                            {w.version && (
                              <span className="text-[10px] text-onork-text-muted">
                                v{w.version}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => runWorkflow(w.name)}
                          disabled={runningId === w.name}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-onork-green bg-onork-green/10 hover:bg-onork-green/20 transition-colors cursor-pointer border-none disabled:opacity-50"
                        >
                          {runningId === w.name ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Play size={12} />
                          )}
                          Run
                        </button>
                      </div>
                      <div className="text-xs text-onork-text-muted ml-[46px]">
                        {w.type || "workflow"} &middot; {w.path.split("/").pop()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Local Workflows */}
          {flows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Workflow size={14} className="text-onork-b2" />
                <h3 className="text-sm font-semibold text-onork-text">Local Workflows</h3>
              </div>

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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
