import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        bg: {
          page: "#0d1117",
          card: "#161b22",
          elevated: "#1c2128",
          hover: "#21262d",
        },
        border: {
          DEFAULT: "#30363d",
          hover: "#484f58",
        },
        text: {
          primary: "#e6edf3",
          secondary: "#c9d1d9",
          muted: "#8b949e",
        },
        accent: {
          primary: "#6EE05A",
          "primary-hover": "#5bc74a",
          blue: "#58a6ff",
          danger: "#f87171",
          warning: "#fbbf24",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      animation: {
        "fade-up": "fade-up 200ms ease-out both",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
