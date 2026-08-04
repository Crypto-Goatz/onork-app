/**
 * Demand radar — what the platform's own users are asking for, and how loudly.
 *
 * WHY SCRAPE RATHER THAN CALL AN API: the board is Canny, whose public API needs
 * a key we do not have. The board itself is server-rendered, so the posts and
 * their vote counts are in the HTML. That makes this fragile in a specific,
 * predictable way — a markup change breaks parsing — so every board reports
 * success or failure independently and a run that parses nothing is recorded as
 * a FAILED run rather than "no demand today". Silent zeroes on a signal you act
 * on are worse than no signal.
 *
 * WHAT IT IS FOR: 83 boards of feature requests, ranked by votes, is a map of
 * unmet demand in the market we sell into. The highest-voted requests the
 * platform has not built are the things agencies would pay someone else for —
 * which is the entire 0nCORE thesis.
 */

const ORIGIN = 'https://ideas.gohighlevel.com'

/** The 83 category boards. Status boards are excluded — they are views, not categories. */
export const BOARDS = [
  'ad-manager', 'ad-reporting-and-attribution', 'affiliate-manager', 'agent-studio',
  'ai-employee', 'ai-knowledge-base', 'ai-studio', 'apis', 'app-marketplace', 'ask-ai',
  'automations', 'blog', 'brand-board', 'bulk-actions', 'call-tracking', 'certificates',
  'chat-widget', 'client-portal', 'communities', 'company-object', 'contacts', 'content-ai',
  'conversation-ai', 'conversations', 'countdown-timer', 'crm', 'custom-objects', 'dashboard',
  'documents-contracts', 'domains', 'e-commerce-stores', 'eliza', 'email', 'external-tracking',
  'fb-ig-messenger', 'forms', 'funnels', 'go-kollab', 'google-my-business', 'highlevel-mcp',
  'hipaa-compliance', 'integrations', 'invoice', 'invoicing', 'language-internationalization',
  'lcemailsystem', 'lcphonesystem', 'listings', 'location-launchpad',
  'marketplace-new-app-request', 'media-library', 'memberships', 'mobile-app', 'onboarding',
  'opportunities', 'payment-links', 'pos-and-mobile-payments', 'priority-support',
  'prospecting-tool', 'qr-codes', 'quizzes', 'rcs-messaging', 'reporting',
  'reputation-management', 'resselling', 'reviews-ai', 'saas', 'scheduling-calendar', 'seo',
  'smartlists', 'snapshots', 'social-planner', 'sub-account-affiliate-manager', 'surveys',
  'tasks', 'templates', 'users-permissions', 'voice-ai', 'website', 'whatsapp', 'widgets',
  'wordpress',
] as const

export interface IdeaPost {
  board: string
  slug: string
  title: string
  url: string
  score: number
  comments: number
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
   .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .trim()

/**
 * Pull one board, sorted by votes.
 *
 * Parses the LIST ITEMS rather than the whole document: each post is an anchor
 * to /{board}/p/{slug} followed by its own score span. Matching them as a pair
 * inside one item is what stops a title being married to the wrong number when
 * the page layout shifts.
 */
export async function fetchBoard(board: string, pages = 2): Promise<{ posts: IdeaPost[]; error?: string }> {
  const posts: IdeaPost[] = []
  try {
    for (let page = 1; page <= pages; page++) {
      const url = `${ORIGIN}/${board}?sort=top${page > 1 ? `&page=${page}` : ''}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0nCORE-research/1.0)' },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) return { posts, error: `board ${board}: HTTP ${res.status}` }
      const html = await res.text()

      // Split on the list-item boundary so a title and its score stay together.
      const chunks = html.split('postListItemV2').slice(1)
      let found = 0
      for (const c of chunks) {
        const href = c.match(new RegExp(`href="/${board}/p/([a-z0-9\\-]+)"`))
        if (!href) continue
        const titleM = c.match(/class="postTitle[^"]*"[^>]*>([^<]{3,200})</)
          || c.match(/<span[^>]*>([^<]{6,200})<\/span>/)
        const scoreM = c.match(/class="score"[^>]*>(\d+)</)
        const title = titleM ? decode(titleM[1]) : ''
        if (!title) continue
        posts.push({
          board,
          slug: href[1],
          title: title.slice(0, 300),
          url: `${ORIGIN}/${board}/p/${href[1]}`,
          score: scoreM ? Number(scoreM[1]) : 0,
          comments: 0,
        })
        found += 1
      }
      // No items on this page means we have run past the end — stop paging
      // rather than hammer a board that has nothing more.
      if (found === 0) break
    }

    // Dedupe: pagination can repeat an item across page boundaries.
    const seen = new Set<string>()
    const unique = posts.filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)))
    return { posts: unique }
  } catch (err) {
    return { posts, error: `board ${board}: ${err instanceof Error ? err.message : 'failed'}` }
  }
}
