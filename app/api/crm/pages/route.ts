import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { think, record } from '@/lib/brain'
import { resolveLocation, projectFor, listPages, createPage, getPage, updatePage, pageLinks } from '@/lib/crm/on3-pages'

/**
 * /api/crm/pages — the marketplace app's website builder (2026-11-14).
 *
 *   GET  ?locationId=                                   the client's pages (thumbnail, preview, edit link each)
 *   POST { action: 'build', locationId, prompt }        plain words → a page (brain: page_builder, Groq) → saved in 0n3
 *   POST { action: 'change', locationId, pageId, prompt } plain words → the full updated page → saved
 *   POST { action: 'links', locationId, pageId }        a fresh 12-hour edit link
 *
 * The sub-account is resolved from the signed session (lib/crm/on3-pages resolveLocation), never trusted from the body
 * alone. Pages live in 0n3 Pages, one project per sub-account, under 0nCore's 0n3 key.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return fail(401, 'Not signed in.')
  const loc = await resolveLocation(session.claims, req.nextUrl.searchParams.get('locationId'))
  if (!loc.ok) return fail(loc.status, loc.error)
  try {
    const project = await projectFor(loc.locationId, loc.name)
    return NextResponse.json({ ok: true, locationId: loc.locationId, pages: await listPages(project) })
  } catch (e) {
    return fail(502, `Pages could not be loaded: ${(e as Error).message}`)
  }
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return fail(401, 'Not signed in.')
  const body = (await req.json().catch(() => ({}))) as { action?: string; locationId?: string; pageId?: string; prompt?: string }
  const loc = await resolveLocation(session.claims, body.locationId)
  if (!loc.ok) return fail(loc.status, loc.error)
  const userId = session.claims.sub
  let project: string
  try { project = await projectFor(loc.locationId, loc.name) } catch (e) { return fail(502, `0n3 could not be reached: ${(e as Error).message}`) }

  if (body.action === 'links') {
    if (!body.pageId) return fail(400, 'Which page?')
    try { return NextResponse.json({ ok: true, ...(await pageLinks(project, body.pageId)) }) } catch (e) { return fail(502, (e as Error).message) }
  }

  if (body.action !== 'build' && body.action !== 'change') return fail(400, 'Say what to do: build, change or links.')
  const prompt = String(body.prompt || '').trim().slice(0, 4000)
  if (!prompt) return fail(400, 'Describe the page first.')

  const started = Date.now()
  let current: unknown = null
  if (body.action === 'change') {
    if (!body.pageId) return fail(400, 'Which page should change?')
    try { current = (await getPage(project, body.pageId)).site } catch (e) { return fail(404, (e as Error).message) }
  }

  // The brain writes the page (app_briefs.page_builder carries the Struktur format and the honesty rules).
  let decision
  try {
    ;({ decision } = await think(userId, 'page_builder', prompt, current ? { current_site: current } : { email: session.claims.email ?? null }))
  } catch (e) {
    return fail(502, `The page could not be written: ${(e as Error).message}`)
  }
  if (decision.tool === 'ask_clarification') {
    await record({ userId, appSlug: 'page_builder', action: body.action, input: { prompt }, decision, output: { question: decision.params.question }, success: true, durationMs: Date.now() - started })
    return NextResponse.json({ ok: true, question: String(decision.params.question || 'Tell me a little more about the business.') })
  }
  const site = decision.params.site
  try {
    const page = body.action === 'change'
      ? await updatePage(project, body.pageId as string, site)
      : await createPage(project, String(decision.params.name || 'New page').slice(0, 120), site)
    await record({ userId, appSlug: 'page_builder', action: body.action, input: { prompt, locationId: loc.locationId }, decision: { ...decision, params: { name: decision.params.name } }, output: { pageId: page.id }, success: true, durationMs: Date.now() - started })
    return NextResponse.json({ ok: true, page })
  } catch (e) {
    await record({ userId, appSlug: 'page_builder', action: body.action, input: { prompt }, decision: { ...decision, params: {} }, output: { error: (e as Error).message }, success: false, durationMs: Date.now() - started })
    return fail(422, `The page was written but could not be saved: ${(e as Error).message}. Try describing it again.`)
  }
}
