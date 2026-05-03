export type TemplateCategory =
  | "Landing Pages"
  | "Funnels"
  | "Thank You Pages"
  | "Booking Pages"
  | "Campaign Pages";

export type TemplateVariable = {
  key: string;
  label: string;
  /** "text" | "textarea" | "url" | "currency" — drives the input type in the customizer */
  type: "text" | "textarea" | "url" | "currency";
  /** Default value used in the preview before the user customizes anything. */
  defaultValue: string;
  /** Optional helper hint under the input. */
  hint?: string;
  /** Pull from CRM location data when present: "name" | "phone" | "address" | "email" | "website" */
  autoFillFrom?: "name" | "phone" | "address" | "email" | "website";
};

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  /** Inline SVG markup used as the thumbnail. */
  thumbnail: string;
  variables: TemplateVariable[];
  /** Single full-document HTML string (with `{{variable}}` placeholders). */
  html: string;
  /** ISO timestamp when this template was added or last edited. */
  updatedAt: string;
  /** Schema version for forward compatibility. */
  version: 1;
};

/**
 * Resolves `{{variable_name}}` placeholders in a template string.
 * Unknown placeholders are left untouched so the user sees what's still missing.
 */
export function renderTemplate(
  source: string,
  values: Record<string, string>,
): string {
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : `{{${key}}}`,
  );
}

/** Extract every `{{variable}}` actually used in a template body. */
export function extractVariableKeys(source: string): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) seen.add(m[1]);
  return Array.from(seen);
}
