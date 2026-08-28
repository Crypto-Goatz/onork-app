#!/usr/bin/env node
/**
 * Derive the capability/service counts the marketing footer claims — at BUILD
 * TIME, from the real 0nMCP catalog, rounded DOWN.
 *
 * WHY THIS EXISTS. The footer shipped "2,000+ capabilities across 150+
 * services" as hardcoded prose. Measured against the pinned dependency
 * (0nmcp@4.10.1, the version this app actually installs) the catalog holds
 * 106 services and 1,319 endpoint capabilities. Both halves of the claim were
 * inflated, on a public page, in the same estate whose house rule is HONEST
 * NUMBERS ONLY. Nobody lied; a number was typed once and the catalog moved.
 *
 * A count quoted in prose has no way to be wrong out loud. This makes it one:
 * the number is measured from the installed package on every build, and if the
 * package cannot be read the file records WHY and the footer prints no claim
 * at all rather than a stale one. That is the sxo-s3-hero-spec rule verbatim —
 * "if the source can't be queried at build, the claim comes off until it can."
 *
 * DELIBERATE UNDERCOUNT. Only SERVICE_CATALOG endpoints are counted. The crm/,
 * vault/ and engine/ modules register several hundred more tools at runtime,
 * but counting those means booting the MCP server inside a build, and a claim
 * that needs a server to stand up is a claim that will silently stop being
 * derived. Undercounting is the safe direction; the spec says round DOWN.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalog-count.json')

/** Round down to a figure a human would say out loud: 1319 -> 1300, 106 -> 100. */
function floorToDisplay(n) {
  if (n >= 1000) return Math.floor(n / 100) * 100
  if (n >= 100) return Math.floor(n / 50) * 50
  if (n >= 10) return Math.floor(n / 10) * 10
  return n
}

let payload
try {
  const mod = await import('0nmcp/catalog')
  const catalog = mod.SERVICE_CATALOG || mod.default
  if (!catalog || typeof catalog !== 'object') throw new Error('SERVICE_CATALOG is not an object')

  const services = Object.keys(catalog)
  if (services.length === 0) throw new Error('SERVICE_CATALOG is empty')

  let capabilities = 0
  for (const key of services) {
    const svc = catalog[key] || {}
    const endpoints = svc.endpoints || svc.tools || {}
    capabilities += Array.isArray(endpoints) ? endpoints.length : Object.keys(endpoints).length
  }
  if (capabilities === 0) throw new Error('catalog declares no endpoints')

  // Read the manifest off disk: 0nmcp's "exports" map does not expose
  // ./package.json, so require('0nmcp/package.json') throws ERR_PACKAGE_PATH_
  // NOT_EXPORTED — which the catch below would have turned into "claim comes
  // off" for a reason that has nothing to do with the catalog being readable.
  const { readFileSync } = await import('node:fs')
  const manifest = join(
    dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '0nmcp', 'package.json',
  )
  const version = JSON.parse(readFileSync(manifest, 'utf8')).version

  payload = {
    ok: true,
    services: services.length,
    capabilities,
    servicesDisplay: floorToDisplay(services.length),
    capabilitiesDisplay: floorToDisplay(capabilities),
    source: `0nmcp@${version} SERVICE_CATALOG`,
    note: 'catalog endpoints only — crm/vault/engine runtime tools are NOT counted, so this is a floor',
    derivedAt: new Date().toISOString(),
  }
  console.log(
    `[catalog-count] ${payload.capabilities} capabilities / ${payload.services} services ` +
      `from ${payload.source} -> renders "${payload.capabilitiesDisplay}+ / ${payload.servicesDisplay}+"`,
  )
} catch (err) {
  payload = {
    ok: false,
    services: null,
    capabilities: null,
    servicesDisplay: null,
    capabilitiesDisplay: null,
    source: null,
    reason: err instanceof Error ? err.message : String(err),
    derivedAt: new Date().toISOString(),
  }
  // NOT a build failure. The claim comes off; the page still ships.
  console.warn(`[catalog-count] UNAVAILABLE (${payload.reason}) — the footer claim will be omitted`)
}

writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n')
