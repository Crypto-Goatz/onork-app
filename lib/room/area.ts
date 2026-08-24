/**
 * WHAT AREA IS THIS PEER WORKING IN — derived, never declared.
 *
 * The room shows an area badge beside every name, always. The tempting way to
 * build that is a "currently working on" field each agent sets. Do not: that is
 * exactly the shape of /api/dispatch/*, which served confident, current-looking
 * JSON for two months after it stopped being true. A field that depends on
 * someone remembering to update it will eventually lie, and a lie beside a name
 * is worse than a blank.
 *
 * So the area is READ OFF the peer's own most recent message. It cannot go stale
 * without the timestamp beside it going stale too, which is visible.
 *
 * TWO RULES THIS FILE OBEYS:
 *  1. It returns null when nothing matches. A classifier that always produces a
 *     label produces a wrong label, and the room would assert someone is on
 *     "Stripe" because their message happened to contain the word "paid".
 *  2. Matching is ORDERED and specific-before-generic. "stripe webhook" is
 *     Stripe, not Webhooks; "cro9 brief" is CRO9, not Content.
 *
 * One definition, used by the API only. The UI renders what it is given — a
 * second classifier in the client is how two surfaces start disagreeing about
 * what an agent is doing.
 */

export type Area = { label: string; tone: AreaTone }

/** Kept small on purpose — these map to colour classes in the room UI. */
export type AreaTone = 'money' | 'content' | 'auth' | 'infra' | 'client' | 'meta'

type Rule = { label: string; tone: AreaTone; test: RegExp }

/**
 * Ordered. First match wins, so put the compound/specific patterns above the
 * single words they contain.
 */
const RULES: Rule[] = [
  // ── money ────────────────────────────────────────────────────────────
  { label: 'Entitlements', tone: 'money', test: /\bproduct_keys?\b|\bentitlement|\baddons\b|all 0n 1 account/i },
  // `funnel`, `hosted/embedded checkout` and `conversion` are here because the
  // real messages that prompted this file were about exactly those and matched
  // nothing — a classifier is only worth what it scores on live traffic.
  { label: 'Stripe', tone: 'money', test: /\bstripe\b|checkout\.session|cs_live_|\bcheckout\b|\bwebhook endpoint|\bprice[_ ]id|\bsku\b|\bpricing\b|\bfounders\b|\brefund|\bfunnel\b|\bconversion\b|\bembedded\b|\bhosted\b/i },
  { label: 'Billing', tone: 'money', test: /\bbilling\b|\binvoice|\bsubscription|\bmetering\b|usage_events|\bdunning\b/i },

  // ── content ──────────────────────────────────────────────────────────
  { label: 'CRO9', tone: 'content', test: /\bcro9\b|cro9_briefs|\bbriefs?\b|generated_content|\bapprovals?\b/i },
  { label: 'Publishing', tone: 'content', test: /\bpublish|wordpress|\bwp[- ]?json|sxo-agent|meta_title|\bplugin\b/i },
  { label: 'SXO', tone: 'content', test: /\bsxo\b|\baeo\b|search console|\bgsc\b|\bkeyword|\bsitemap\b|\bindexnow\b/i },
  { label: 'Content', tone: 'content', test: /\bcopy\b|\bcontent\b|\bheadings?\b|\bacronym|\bcourse\b|\bblog\b/i },

  // ── auth ─────────────────────────────────────────────────────────────
  { label: 'CRM OAuth', tone: 'auth', test: /\boauth\b|client credentials|client_id|client_secret|\binstall(s|ed|ation)?\b|authorization code|\bmarketplace app|locationToken/i },
  { label: 'Auth', tone: 'auth', test: /\bauth\b|\bsso\b|\blogin\b|\btoken\b|\bsession\b|\bvault\b|0n_live_/i },

  // ── infra ────────────────────────────────────────────────────────────
  { label: 'Extension', tone: 'infra', test: /\bextension\b|service ?worker|chrome|manifest\.json|\bunpacked\b/i },
  { label: 'Deploys', tone: 'infra', test: /\bdeploy|\bvercel\b|github action|\bbuild\b|\bworkflow run|\bpipeline\b/i },
  { label: 'Database', tone: 'infra', test: /\bsupabase\b|\bmigration|\brls\b|\bschema\b|\bsql\b|\btable\b|\bcolumn\b/i },
  { label: 'Webhooks', tone: 'infra', test: /\bwebhook|\bsignature\b|ed25519|\bhmac\b/i },

  // ── client work ──────────────────────────────────────────────────────
  { label: 'Hub', tone: 'client', test: /\bhub\b|\bdashboard\b|\bonboarding\b|\bbanner\b|\bui\b|\bdesign\b/i },
  { label: 'Client site', tone: 'client', test: /\bwpsxo\b|web0n|0ntask|jaxspot|spa ?ligonier|rocketopp|kidcard|la7oh/i },

  // ── meta ─────────────────────────────────────────────────────────────
  { label: 'The room', tone: 'meta', test: /\bbridge\b|\bthe room\b|\bpeer\b|\bhandoff\b|current-state/i },
  { label: 'Review', tone: 'meta', test: /\bverif|\bmeasured\b|\bprobe\b|\baudit\b|\bcorrection\b|\bwrong\b|\bpostmortem|\blesson/i },
]

/**
 * Classify a peer's latest message into an area.
 *
 * Pass the SUBJECT first and the body second: a subject is written to say what
 * the message is about, whereas a long body mentions everything the agent
 * touched and would drag every message toward whichever rule sits highest.
 */
export function areaFor(subject: string | null, detail?: string | null): Area | null {
  const subj = (subject || '').trim()
  if (subj) {
    const hit = RULES.find((r) => r.test.test(subj))
    if (hit) return { label: hit.label, tone: hit.tone }
  }

  // Fall back to the body only when the subject said nothing recognisable, and
  // only its opening — the further in you read, the less it is about the point.
  const head = (detail || '').slice(0, 400)
  if (head) {
    const hit = RULES.find((r) => r.test.test(head))
    if (hit) return { label: hit.label, tone: hit.tone }
  }

  // Deliberately null. The room prints "area unknown" rather than guessing.
  return null
}
