"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  HelpCircle,
  Activity,
  KeyRound,
  Workflow,
  Clock,
  MessageSquare,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cmd: string) => void;
}

const COMMANDS = [
  { cmd: "/chat", desc: "Open chat", icon: MessageSquare, group: "Navigate" },
  { cmd: "/vault", desc: "Manage credentials", icon: KeyRound, group: "Navigate" },
  { cmd: "/flows", desc: "View workflows", icon: Workflow, group: "Navigate" },
  { cmd: "/history", desc: "Activity log", icon: Clock, group: "Navigate" },
  { cmd: "/help", desc: "Show commands", icon: HelpCircle, group: "General" },
  { cmd: "/status", desc: "Check connections", icon: Activity, group: "General" },
];

export function CommandPalette({ open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter(
    (c) =>
      !query ||
      c.cmd.toLowerCase().includes(query.toLowerCase()) ||
      c.desc.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        onSelect(filtered[activeIndex].cmd);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, onSelect, filtered, activeIndex]);

  if (!open) return null;

  // Group filtered commands
  const groups = filtered.reduce<Record<string, typeof COMMANDS>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-onork-bg/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-[640px] mx-4 glass rounded-2xl overflow-hidden animate-scale-in shadow-2xl shadow-onork-p1/10">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-white/[0.08]">
          <Search size={16} className="text-onork-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-onork-text placeholder:text-onork-text-muted outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-onork-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {Object.entries(groups).map(([group, cmds]) => (
            <div key={group}>
              <div className="px-4 py-1.5 text-xs font-semibold text-onork-text-muted uppercase tracking-wider">
                {group}
              </div>
              {cmds.map((c) => {
                flatIndex++;
                const idx = flatIndex;
                const Icon = c.icon;
                return (
                  <button
                    key={c.cmd}
                    onClick={() => onSelect(c.cmd)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors border-none bg-transparent ${
                      activeIndex === idx
                        ? "bg-white/[0.06] text-onork-text"
                        : "text-onork-text-dim hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon size={16} className={activeIndex === idx ? "text-onork-p3" : "text-onork-text-muted"} />
                    <span className="font-mono text-xs text-onork-p3">{c.cmd}</span>
                    <span className="text-sm">{c.desc}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-onork-text-muted">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
