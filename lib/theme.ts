export const B = {
  bg: "#08081a",
  surface: "#0d0f24",
  card: "#12143a",
  border: "#1e2258",
  borderHi: "#2d3580",
  p1: "#7c3aed",
  p2: "#6366f1",
  p3: "#818cf8",
  b1: "#3b82f6",
  b2: "#60a5fa",
  grad: "linear-gradient(135deg, #7c3aed, #3b82f6)",
  gradSoft: "linear-gradient(135deg, #7c3aed22, #3b82f622)",
  glow: "#7c3aed44",
  green: "#34d399",
  red: "#f87171",
  amber: "#fbbf24",
  text: "#f0f0ff",
  textDim: "#a0a8d0",
  textMuted: "#505880",
} as const;

export type ThemeColor = keyof typeof B;
