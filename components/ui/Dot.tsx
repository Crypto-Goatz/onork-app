"use client";

interface DotProps {
  on: boolean;
  size?: "sm" | "md";
}

export function Dot({ on, size = "sm" }: DotProps) {
  const px = size === "md" ? "w-2 h-2" : "w-1.5 h-1.5";
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${px} ${
        on
          ? "bg-onork-green shadow-[0_0_6px_#34d39955] animate-pulse-dot"
          : "bg-onork-red shadow-[0_0_6px_#f8717155]"
      }`}
    />
  );
}
