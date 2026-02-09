"use client";

import { useMemo } from "react";
import { Clock, Link, Zap, MessageSquare, Pin, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { HistoryEntry } from "@/lib/hooks/useHistory";

interface HistoryOverlayProps {
  history: HistoryEntry[];
  onClear: () => void;
}

function typeIcon(type: string) {
  switch (type) {
    case "connect": return Link;
    case "workflow": return Zap;
    case "chat": return MessageSquare;
    default: return Pin;
  }
}

function typeColor(type: string) {
  switch (type) {
    case "connect": return { bg: "bg-onork-green/10", text: "text-onork-green" };
    case "workflow": return { bg: "bg-onork-b1/10", text: "text-onork-b2" };
    case "chat": return { bg: "bg-onork-p1/10", text: "text-onork-p3" };
    default: return { bg: "bg-onork-p1/10", text: "text-onork-p3" };
  }
}

function groupByDate(entries: HistoryEntry[]) {
  const groups: Record<string, HistoryEntry[]> = {};
  for (const entry of entries) {
    const date = new Date(entry.ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }
  return groups;
}

export function HistoryOverlay({ history, onClear }: HistoryOverlayProps) {
  const grouped = useMemo(() => groupByDate(history), [history]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-onork-text">History</h2>
          <p className="text-sm text-onork-text-dim mt-0.5">
            {history.length} event{history.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-onork-red/20 text-onork-red text-xs font-medium hover:bg-onork-red/10 transition-colors cursor-pointer bg-transparent"
          >
            <Trash2 size={12} />
            Clear all
          </button>
        )}
      </div>

      {/* Content */}
      {history.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity yet"
          description="Actions and events will appear here as you use 0nork."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <div className="text-xs font-semibold text-onork-text-muted uppercase tracking-wider mb-3 sticky top-0 bg-onork-bg/80 backdrop-blur-sm py-1 z-[1]">
                {date}
              </div>
              <div className="space-y-1">
                {entries.map((e, i) => {
                  const Icon = typeIcon(e.type);
                  const colors = typeColor(e.type);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors animate-stagger-in"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {/* Timeline line + icon */}
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} className={colors.text} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-onork-text font-medium truncate">
                          {e.detail}
                        </div>
                      </div>

                      <span className="text-xs text-onork-text-muted shrink-0">
                        {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
