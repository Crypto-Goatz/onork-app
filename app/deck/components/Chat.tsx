"use client";

import { useRef, useEffect } from "react";
import { Ico } from "@/components/ui/Ico";
import { User, Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export interface ChatMessage {
  r: "user" | "sys";
  t: string;
  source?: "0nmcp" | "local";
  status?: "completed" | "failed";
  steps?: number;
  services?: string[];
  loading?: boolean;
}

interface ChatProps {
  msgs: ChatMessage[];
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Chat({ msgs }: ChatProps) {
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 animate-stagger-in ${
              m.r === "user" ? "flex-row-reverse" : ""
            }`}
            style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
          >
            {/* Avatar */}
            {m.r === "sys" ? (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-onork-p1 to-onork-b1 flex items-center justify-center">
                {m.loading ? (
                  <Loader2 size={16} className="text-white animate-spin" />
                ) : (
                  <Ico name="onork" sz={18} />
                )}
              </div>
            ) : (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-onork-card border border-white/[0.08] flex items-center justify-center">
                <User size={14} className="text-onork-text-dim" />
              </div>
            )}

            {/* Bubble */}
            <div className="max-w-[70%] lg:max-w-[60%] min-w-0">
              <div
                className={`text-sm leading-relaxed break-words whitespace-pre-wrap px-4 py-3 ${
                  m.r === "user"
                    ? "bg-gradient-to-br from-onork-p1 to-onork-b1 text-white rounded-2xl rounded-tr-md"
                    : "glass-card rounded-2xl rounded-tl-md text-onork-text"
                }`}
              >
                {m.loading ? (
                  <span className="text-onork-text-dim italic">Executing via 0nMCP...</span>
                ) : (
                  m.t
                )}
              </div>

              {/* Execution metadata */}
              {m.r === "sys" && m.source === "0nmcp" && !m.loading && (
                <div className="flex items-center gap-3 mt-1.5 px-1">
                  <div className="flex items-center gap-1">
                    {m.status === "completed" ? (
                      <CheckCircle2 size={11} className="text-onork-green" />
                    ) : m.status === "failed" ? (
                      <XCircle size={11} className="text-onork-red" />
                    ) : null}
                    <span className="text-[10px] text-onork-text-muted uppercase tracking-wider">
                      {m.status || "done"}
                    </span>
                  </div>
                  {m.steps != null && m.steps > 0 && (
                    <div className="flex items-center gap-1">
                      <Zap size={10} className="text-onork-b2" />
                      <span className="text-[10px] text-onork-text-muted">
                        {m.steps} step{m.steps !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {m.services && m.services.length > 0 && (
                    <span className="text-[10px] text-onork-text-muted">
                      via {m.services.join(", ")}
                    </span>
                  )}
                </div>
              )}

              <div
                className={`text-xs text-onork-text-muted mt-1 px-1 ${
                  m.r === "user" ? "text-right" : ""
                }`}
              >
                {m.source === "0nmcp" && (
                  <span className="text-onork-p3 mr-2">0nMCP</span>
                )}
                {formatTime()}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEnd} />
      </div>
    </div>
  );
}
