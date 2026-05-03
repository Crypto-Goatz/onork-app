const LOCATION_PATTERNS: RegExp[] = [
  /\/v2\/location\/([A-Za-z0-9]{10,})/,
  /\/location\/([A-Za-z0-9]{10,})/,
  /[?&]locationId=([A-Za-z0-9]{10,})/,
];

const ALLOWED_HOSTS = [
  "rocketclients.com",
  "leadconnectorhq.com",
  "gohighlevel.com",
  "180crm.com",
];

export function extractLocationId(url: string | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const isAllowed = ALLOWED_HOSTS.some((host) => parsed.hostname.endsWith(host));
  if (!isAllowed) return null;
  for (const pattern of LOCATION_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function getCrmBaseDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.some((h) => parsed.hostname.endsWith(h))) return null;
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}
