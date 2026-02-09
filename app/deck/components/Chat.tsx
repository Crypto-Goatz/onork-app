"use client";

import { useRef, useEffect } from "react";
import { Ico } from "@/components/ui/Ico";
import { User } from "lucide-react";

export interface ChatMessage {
  r: "user" | "sys";
  t: string;
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
                <Ico name="onork" sz={18} />
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
                {m.t}
              </div>
              <div
                className={`text-xs text-onork-text-muted mt-1 px-1 ${
                  m.r === "user" ? "text-right" : ""
                }`}
              >
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
