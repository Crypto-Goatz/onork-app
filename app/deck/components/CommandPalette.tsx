"use client";

interface CommandPaletteProps {
  open: boolean;
  onSelect: (cmd: string) => void;
}

const COMMANDS = [
  { cmd: "/help", desc: "commands" },
  { cmd: "/status", desc: "connections" },
  { cmd: "/vault", desc: "credentials" },
  { cmd: "/flows", desc: "workflows" },
  { cmd: "/history", desc: "activity log" },
];

export function CommandPalette({ open, onSelect }: CommandPaletteProps) {
  if (!open) return null;

  return (
    <div
      className="absolute bottom-16 left-2 right-2 z-50 animate-slide-up"
      style={{
        background: "#0d0f24",
        border: "1px solid #1e2258",
        borderRadius: 12,
        padding: 5,
      }}
    >
      {COMMANDS.map(({ cmd, desc }) => (
        <button
          key={cmd}
          onClick={() => onSelect(cmd)}
          className="block w-full text-left cursor-pointer rounded-md hover:bg-onork-card"
          style={{
            background: "none",
            border: "none",
            padding: "7px 8px",
            color: "#f0f0ff",
            fontSize: 12,
          }}
        >
          <span className="font-mono text-onork-p3">{cmd}</span>
          <span className="text-onork-text-muted ml-1.5 text-[11px]">
            &mdash; {desc}
          </span>
        </button>
      ))}
    </div>
  );
}
