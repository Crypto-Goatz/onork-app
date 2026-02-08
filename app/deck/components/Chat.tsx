"use client";

import { useRef, useEffect } from "react";
import { Ico } from "@/components/ui/Ico";

export interface ChatMessage {
  r: "user" | "sys";
  t: string;
}

interface ChatProps {
  msgs: ChatMessage[];
}

export function Chat({ msgs }: ChatProps) {
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  return (
    <div className="flex-1 overflow-auto" style={{ padding: "10px 8px" }}>
      {msgs.map((m, i) => (
        <div
          key={i}
          className="flex items-start animate-slide-up"
          style={{
            justifyContent: m.r === "user" ? "flex-end" : "flex-start",
            marginBottom: 6,
            padding: "0 2px",
          }}
        >
          {m.r === "sys" && (
            <div className="shrink-0 mr-[5px] mt-1" style={{ width: 18, height: 18 }}>
              <Ico name="onork" sz={18} />
            </div>
          )}
          <div
            className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-onork-text"
            style={{
              maxWidth: "82%",
              padding: "9px 12px",
              borderRadius: m.r === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
              background: m.r === "user" ? "linear-gradient(135deg, #7c3aed, #3b82f6)" : "#12143a",
              border: m.r === "user" ? "none" : "1px solid #1e2258",
            }}
          >
            {m.t}
          </div>
        </div>
      ))}
      <div ref={chatEnd} />
    </div>
  );
}
