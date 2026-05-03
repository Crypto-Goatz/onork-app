import type { Template } from "./types";
import { BUILT_IN_TEMPLATES } from "./library";

const KEY = "userTemplates";

export async function getUserTemplates(): Promise<Template[]> {
  const data = await chrome.storage.local.get(KEY);
  const list = (data[KEY] ?? []) as Template[];
  return Array.isArray(list) ? list : [];
}

export async function saveUserTemplate(t: Template): Promise<void> {
  const list = await getUserTemplates();
  const idx = list.findIndex((x) => x.id === t.id);
  const next = idx >= 0 ? list.map((x, i) => (i === idx ? t : x)) : [...list, t];
  await chrome.storage.local.set({ [KEY]: next });
}

export async function removeUserTemplate(id: string): Promise<void> {
  const list = await getUserTemplates();
  await chrome.storage.local.set({ [KEY]: list.filter((x) => x.id !== id) });
}

export async function getAllTemplates(): Promise<Template[]> {
  const user = await getUserTemplates();
  // user templates can override built-ins by id
  const map = new Map<string, Template>();
  for (const t of BUILT_IN_TEMPLATES) map.set(t.id, t);
  for (const t of user) map.set(t.id, t);
  return Array.from(map.values());
}

export function isValidTemplate(input: unknown): input is Template {
  if (!input || typeof input !== "object") return false;
  const t = input as Partial<Template>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.category === "string" &&
    typeof t.html === "string" &&
    Array.isArray(t.variables)
  );
}
