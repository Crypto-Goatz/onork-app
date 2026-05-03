export type SavedLocation = {
  id: string;
  name: string;
  pitToken: string;
  createdAt: number;
};

export type CampaignTemplate = {
  id: string;
  name: string;
  description: string;
  steps: CampaignStep[];
};

export type CampaignStep =
  | { type: "create_tag"; name: string }
  | { type: "create_trigger_link"; name: string; redirectTo: string }
  | { type: "create_custom_field"; name: string; dataType: string }
  | { type: "note"; text: string };

export type StorageShape = {
  locations: SavedLocation[];
  activeLocationId: string | null;
  detectedLocationId: string | null;
  campaignTemplates: CampaignTemplate[];
};

const DEFAULT_STATE: StorageShape = {
  locations: [],
  activeLocationId: null,
  detectedLocationId: null,
  campaignTemplates: [],
};

export async function getState(): Promise<StorageShape> {
  const data = await chrome.storage.local.get(Object.keys(DEFAULT_STATE));
  return { ...DEFAULT_STATE, ...data } as StorageShape;
}

export async function setState(patch: Partial<StorageShape>): Promise<void> {
  await chrome.storage.local.set(patch);
}

export async function getLocations(): Promise<SavedLocation[]> {
  const { locations } = await getState();
  return locations;
}

export async function saveLocation(loc: Omit<SavedLocation, "createdAt">): Promise<SavedLocation> {
  const state = await getState();
  const existingIndex = state.locations.findIndex((l) => l.id === loc.id);
  const next: SavedLocation = { ...loc, createdAt: Date.now() };
  const locations =
    existingIndex >= 0
      ? state.locations.map((l, i) => (i === existingIndex ? { ...next, createdAt: l.createdAt } : l))
      : [...state.locations, next];
  await setState({
    locations,
    activeLocationId: state.activeLocationId ?? loc.id,
  });
  return next;
}

export async function removeLocation(id: string): Promise<void> {
  const state = await getState();
  const locations = state.locations.filter((l) => l.id !== id);
  const activeLocationId =
    state.activeLocationId === id ? (locations[0]?.id ?? null) : state.activeLocationId;
  await setState({ locations, activeLocationId });
}

export async function setActiveLocation(id: string): Promise<void> {
  await setState({ activeLocationId: id });
}

export async function getActiveLocation(): Promise<SavedLocation | null> {
  const state = await getState();
  if (!state.activeLocationId) return null;
  return state.locations.find((l) => l.id === state.activeLocationId) ?? null;
}

export async function getTokenForLocation(locationId: string): Promise<string | null> {
  const state = await getState();
  const loc = state.locations.find((l) => l.id === locationId);
  return loc?.pitToken ?? null;
}

export async function setDetectedLocation(id: string | null): Promise<void> {
  await setState({ detectedLocationId: id });
}

export async function saveCampaignTemplate(t: CampaignTemplate): Promise<void> {
  const state = await getState();
  const existing = state.campaignTemplates.findIndex((x) => x.id === t.id);
  const campaignTemplates =
    existing >= 0
      ? state.campaignTemplates.map((x, i) => (i === existing ? t : x))
      : [...state.campaignTemplates, t];
  await setState({ campaignTemplates });
}

export async function getCampaignTemplates(): Promise<CampaignTemplate[]> {
  const { campaignTemplates } = await getState();
  return campaignTemplates;
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}
