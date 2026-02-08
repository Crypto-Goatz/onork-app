"use client";

import { useRef } from "react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onSlash: (show: boolean) => void;
}

export function ChatInput({ value, onChange, onSend, onSlash }: ChatInputProps) {
  const iRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="shrink-0"
      style={{
        padding: "8px 12px 12px",
        borderTop: "1px solid #1e2258",
        background: "rgba(8,8,26,0.92)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex gap-1.5">
        <input
          ref={iRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onSlash(e.target.value === "/");
          }}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Ask anything or type / ..."
          className="flex-1 outline-none transition-all duration-150 text-onork-text"
          style={{
            background: "#0d0f24",
            border: "1px solid #1e2258",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#6366f155")}
          onBlur={(e) => (e.target.style.borderColor = "#1e2258")}
        />
        <button
          onClick={onSend}
          className="cursor-pointer font-extrabold"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            border: "none",
            borderRadius: 10,
            padding: "0 16px",
            color: "#fff",
            fontSize: 15,
          }}
        >
          &uarr;
        </button>
      </div>
      <div className="text-center text-[7px] text-onork-text-muted mt-[5px] tracking-[0.15em] uppercase">
        0nork &middot; Rocket+ &middot; 0nMCP &middot; MCPFED
      </div>
    </div>
  );
}
