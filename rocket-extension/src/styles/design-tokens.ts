export const colors = {
  bg: "#0d1117",
  card: "#161b22",
  elevated: "#1c2128",
  hover: "#21262d",
  border: "#30363d",
  borderHover: "#484f58",
  primary: "#6EE05A",
  primaryHover: "#5bc74a",
  text: "#e6edf3",
  textSecondary: "#c9d1d9",
  muted: "#8b949e",
  danger: "#f87171",
  warning: "#fbbf24",
  accent: "#58a6ff",
} as const;

export const fonts = {
  primary: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
} as const;

export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.2)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
  glow: "0 0 0 3px rgba(110, 224, 90, 0.15)",
} as const;

export const motion = {
  fast: "150ms ease",
  base: "200ms ease-out",
  slow: "300ms ease-out",
} as const;

export const designTokens = {
  colors,
  fonts,
  spacing,
  radius,
  shadows,
  motion,
} as const;

export type DesignTokens = typeof designTokens;

/**
 * Returns a `:root` CSS custom-property block that mirrors the design tokens.
 * Used to inject the dark theme into a CRM location's white-label CSS settings.
 */
export function tokensToCssVariables(): string {
  return `:root {
  --on-bg: ${colors.bg};
  --on-card: ${colors.card};
  --on-elevated: ${colors.elevated};
  --on-hover: ${colors.hover};
  --on-border: ${colors.border};
  --on-border-hover: ${colors.borderHover};
  --on-primary: ${colors.primary};
  --on-primary-hover: ${colors.primaryHover};
  --on-text: ${colors.text};
  --on-text-secondary: ${colors.textSecondary};
  --on-muted: ${colors.muted};
  --on-danger: ${colors.danger};
  --on-warning: ${colors.warning};
  --on-accent: ${colors.accent};
  --on-radius-sm: ${radius.sm};
  --on-radius-md: ${radius.md};
  --on-radius-lg: ${radius.lg};
  --on-radius-xl: ${radius.xl};
  --on-font-sans: ${fonts.primary};
  --on-font-mono: ${fonts.mono};
}`;
}

/**
 * The full 0n theme stylesheet — drops onto a CRM location's
 * sites/funnels custom CSS so every page inherits the dark theme.
 */
export function build0nThemeStylesheet(): string {
  return `${tokensToCssVariables()}

/* 0n theme — applied via Apply Theme in RocketOpp Admin extension */
html, body {
  background: var(--on-bg);
  color: var(--on-text-secondary);
  font-family: var(--on-font-sans);
  -webkit-font-smoothing: antialiased;
}

a { color: var(--on-primary); text-decoration: none; }
a:hover { color: var(--on-primary-hover); }

button, .btn-primary {
  background: var(--on-primary);
  color: var(--on-bg);
  border: 0;
  border-radius: var(--on-radius-md);
  padding: 10px 18px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease;
}
button:hover, .btn-primary:hover { background: var(--on-primary-hover); }

input, textarea, select {
  background: var(--on-bg);
  color: var(--on-text);
  border: 1px solid var(--on-border);
  border-radius: var(--on-radius-md);
  padding: 10px 12px;
  font-family: var(--on-font-sans);
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--on-primary);
  box-shadow: 0 0 0 3px rgba(110, 224, 90, 0.15);
}

.card {
  background: var(--on-card);
  border: 1px solid var(--on-border);
  border-radius: var(--on-radius-xl);
  padding: 24px;
}

h1, h2, h3, h4 { color: var(--on-text); }
code, pre { font-family: var(--on-font-mono); }
`;
}
