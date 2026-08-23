/**
 * /vault — served at vault.0ncore.com, THE ONE DOOR for connecting an app.
 *
 * A server shell around the client surface, for one reason worth stating: a
 * 'use client' page cannot export `metadata`, so the door inherited the root
 * layout's marketing <title> and was indistinguishable from the homepage in
 * the served HTML. That is exactly how the dead next.config rewrite went
 * unnoticed for weeks — vault.0ncore.com answered 200 with a marketing title
 * and nothing anywhere said it was the wrong page. The title is now the
 * cheapest possible proof of which surface answered.
 *
 * noindex because it is gated and holds credential UI. A logged-out crawler
 * only ever sees the login redirect, but saying so costs nothing.
 */
import type { Metadata } from 'next'
import VaultConnect from './VaultConnect'

export const metadata: Metadata = {
  title: '0nVault — connect an app',
  description: 'Connect an app once. Every 0n product uses it.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://vault.0ncore.com/' },
}

export default function VaultPage() {
  return <VaultConnect />
}
