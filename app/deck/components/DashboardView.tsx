"use client";

import { useMemo } from "react";
import {
  KeyRound,
  MessageSquare,
  Workflow,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { SVC, SERVICE_COUNT } from "@/lib/services";
import { Ico } from "@/components/ui/Ico";
import { getIdeas } from "@/lib/ideas";
import type { HistoryEntry } from "@/lib/hooks/useHistory";

type View = "dashboard" | "chat" | "vault" | "flows" | "history";

interface DashboardViewProps {
  vaultCount: number;
  flowCount: number;
  historyCount: number;
  isC: (service: string) => boolean;
  recentHistory: HistoryEntry[];
  setView: (v: View) => void;
}

export function DashboardView({
  vaultCount,
  flowCount,
  historyCount,
  isC,
  recentHistory,
  setView,
}: DashboardViewProps) {
  const connectedKeys = Object.keys(SVC).filter((k) => isC(k));

  const ideas = useMemo(() => {
    return getIdeas(connectedKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedKeys.join(",")]);

  const stats = [
    {
      label: "Services",
      value: `${vaultCount}/${SERVICE_COUNT}`,
      icon: KeyRound,
      color: "text-onork-p3",
      bg: "bg-onork-p1/10",
      onClick: () => setView("vault"),
    },
    {
      label: "Workflows",
      value: flowCount,
      icon: Workflow,
      color: "text-onork-b2",
      bg: "bg-onork-b1/10",
      onClick: () => setView("flows"),
    },
    {
      label: "Activity",
      value: historyCount,
      icon: Clock,
      color: "text-onork-green",
      bg: "bg-onork-green/10",
      onClick: () => setView("history"),
    },
    {
      label: "Chat",
      value: "Open",
      icon: MessageSquare,
      color: "text-onork-amber",
      bg: "bg-onork-amber/10",
      onClick: () => setView("chat"),
    },
  ];

  return (
    <div className="p-6 lg:p-8 2xl:p-10 max-w-full mx-auto w-full animate-fade-in space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-onork-text">Command Center</h1>
        <p className="text-sm text-onork-text-dim mt-1">
          {vaultCount > 0
            ? `${vaultCount} service${vaultCount !== 1 ? "s" : ""} connected and ready.`
            : "Connect your first service to get started."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="glass-card rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-onork-p1/5 cursor-pointer group animate-stagger-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="text-xl font-bold text-onork-text">{s.value}</div>
            <div className="text-xs text-onork-text-dim mt-0.5 flex items-center gap-1">
              {s.label}
              <ArrowRight
                size={12}
                className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
              />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {/* Ideas */}
        <div className="glass-card rounded-2xl p-5 animate-stagger-in" style={{ animationDelay: "280ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-onork-p3" />
            <h2 className="text-sm font-semibold text-onork-text">Ideas</h2>
            <span className="text-xs text-onork-text-muted ml-auto">
              {ideas.length} suggestion{ideas.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {ideas.slice(0, 5).map((idea, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-onork-p3 mt-1.5 shrink-0" />
                <span className="text-sm text-onork-text-dim leading-relaxed">{idea}</span>
              </div>
            ))}
            {ideas.length === 0 && (
              <p className="text-sm text-onork-text-muted py-3 text-center">
                Connect services to unlock ideas
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-2xl p-5 animate-stagger-in" style={{ animationDelay: "340ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-onork-green" />
            <h2 className="text-sm font-semibold text-onork-text">Recent Activity</h2>
            {recentHistory.length > 0 && (
              <button
                onClick={() => setView("history")}
                className="text-xs text-onork-b2 hover:text-onork-p3 transition-colors ml-auto cursor-pointer"
              >
                View all
              </button>
            )}
          </div>
          <div className="space-y-1">
            {recentHistory.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-onork-b2/50 shrink-0" />
                <span className="text-sm text-onork-text-dim truncate flex-1">
                  {entry.detail}
                </span>
                <span className="text-xs text-onork-text-muted shrink-0">
                  {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {recentHistory.length === 0 && (
              <p className="text-sm text-onork-text-muted py-3 text-center">
                No activity yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Connected Services */}
      {connectedKeys.length > 0 && (
        <div className="glass-card rounded-2xl p-5 animate-stagger-in" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={16} className="text-onork-p3" />
            <h2 className="text-sm font-semibold text-onork-text">Connected Services</h2>
            <button
              onClick={() => setView("vault")}
              className="text-xs text-onork-b2 hover:text-onork-p3 transition-colors ml-auto cursor-pointer"
            >
              Manage
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {connectedKeys.map((k) => {
              const s = SVC[k];
              return (
                <div
                  key={k}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                >
                  <Ico name={s.logo} sz={16} />
                  <span className="text-xs font-medium text-onork-text">{s.l}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-onork-green" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
