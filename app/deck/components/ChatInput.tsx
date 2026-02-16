"use client";

import { useRef } from "react";
import { SendHorizontal } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onSlash: (show: boolean) => void;
  mcpOnline?: boolean;
}

export function ChatInput({ value, onChange, onSend, onSlash, mcpOnline }: ChatInputProps) {
  const iRef = useRef<HTMLInputElement>(null);

  return (
    <div className="shrink-0 px-4 md:px-8 lg:px-12 pb-4 pt-2 border-t border-white/[0.08] bg-onork-bg/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2">
          <input
            ref={iRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onSlash(e.target.value === "/");
            }}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder={mcpOnline ? "Execute any task across 26 services..." : "Ask anything or type / for commands..."}
            className="flex-1 h-12 px-4 rounded-xl bg-onork-surface border border-white/[0.08] text-sm text-onork-text placeholder:text-onork-text-muted outline-none focus-visible:ring-2 focus-visible:ring-onork-p2 ring-offset-2 ring-offset-onork-bg transition-all"
          />
          <button
            onClick={onSend}
            className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-onork-p1 to-onork-b1 text-white flex items-center justify-center hover:shadow-lg hover:shadow-onork-p1/20 active:scale-95 transition-all cursor-pointer"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
        <div className="text-center text-xs text-onork-text-muted mt-2 tracking-widest uppercase">
          {mcpOnline ? (
            <span>
              <span className="text-onork-green">0nMCP Live</span>
              {" \u00b7 "}550 Tools{" \u00b7 "}26 Services
            </span>
          ) : (
            <span>0nork &middot; Rocket+ &middot; 0nMCP</span>
          )}
        </div>
      </div>
    </div>
  );
}
