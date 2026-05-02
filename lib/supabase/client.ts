import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

/**
 * Cookie-domain override so the auth cookie is shared across all 0ncore
 * subdomains (www.0ncore.com, dispatch.0ncore.com, etc). Without this the
 * cookie defaults to the request host and dispatch.0ncore.com sees no
 * session — every click logs the user out.
 *
 * Configured via NEXT_PUBLIC_AUTH_COOKIE_DOMAIN. In dev (no env), defaults
 * to undefined so localhost still works.
 */
const AUTH_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: AUTH_COOKIE_DOMAIN
      ? { domain: AUTH_COOKIE_DOMAIN, path: '/', sameSite: 'lax', secure: true }
      : undefined,
  });
}
