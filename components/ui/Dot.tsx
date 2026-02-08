"use client";

interface DotProps {
  on: boolean;
}

export function Dot({ on }: DotProps) {
  return (
    <span
      className={on ? "animate-pulse-dot" : ""}
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        display: "inline-block",
        background: on ? "#34d399" : "#f87171",
        boxShadow: `0 0 6px ${on ? "#34d39955" : "#f8717155"}`,
      }}
    />
  );
}
