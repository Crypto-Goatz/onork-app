import { crmGet, crmPostRaw } from '@/lib/crm'

/**
 * Publishing generated pages as native blog posts.
 *
 * WHY THIS MATTERS. Funnels and funnel pages are read-only across the entire
 * API — `/funnels/page` and `/funnels/funnel/list` are GET only, verified
 * against the specs. Blog posts are the ONE native, indexable page type the
 * platform lets us create. `POST /blogs/posts` exists and nobody uses it,
 * because everyone assumes the whole content surface is closed.
 *
 * THE CATCH: the endpoint requires twelve fields and three of them are ids that
 * must be looked up first — the blog site, an author, and at least one
 * category. Sending a post without them fails validation, so `resolveBlogTargets`
 * does that legwork and reports which piece is missing rather than returning a
 * bare 422.
 */

export interface BlogTargets {
  blogId: string
  blogName: string
  authorId: string
  authorName: string
  categoryIds: string[]
  categoryNames: string[]
}

export interface BlogTargetProblem {
  problem: string
  /** What the user has to do in the CRM UI, in their words. */
  fix: string
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { _raw: text.slice(0, 400) }
  }
}

/** Pull the ids `POST /blogs/posts` demands. Each can legitimately be absent. */
export async function resolveBlogTargets(
  locationId: string
): Promise<BlogTargets | BlogTargetProblem> {
  // These endpoints take skip/limit as REQUIRED query params — omitting them is
  // a 422 that reads like a permissions failure.
  const sitesRes = await crmGet('/blogs/site/all?skip=0&limit=20', locationId)
  if (!sitesRes.ok) {
    const body = await readJson(sitesRes)
    return {
      problem: `Could not list blog sites (${sitesRes.status}). ${body?.message || ''}`.trim(),
      fix: 'Confirm the app install for this location carries the blogs/post.write scope.',
    }
  }
  const sites = await readJson(sitesRes)
  const site = (sites?.data || sites?.blogs || sites?.sites || [])[0]
  if (!site) {
    return {
      problem: 'This location has no blog site.',
      fix: 'Create a blog in the CRM under Sites → Blogs, then run this again. A blog site cannot be created through the API.',
    }
  }

  const [authorsRes, catsRes] = await Promise.all([
    crmGet('/blogs/authors?limit=20&offset=0', locationId),
    crmGet('/blogs/categories?limit=20&offset=0', locationId),
  ])
  const authors = (await readJson(authorsRes))?.authors || (await Promise.resolve([]))
  const cats = (await readJson(catsRes))?.categories || []

  const author = Array.isArray(authors) ? authors[0] : undefined
  const category = Array.isArray(cats) ? cats[0] : undefined

  if (!author) {
    return {
      problem: 'This blog has no author.',
      fix: 'Add an author to the blog in the CRM. The post endpoint requires an author id and will not accept a name.',
    }
  }
  if (!category) {
    return {
      problem: 'This blog has no categories.',
      fix: 'Add at least one category to the blog in the CRM. `categories` is a required array of ids.',
    }
  }

  return {
    blogId: site._id || site.id,
    blogName: site.name || site.title || 'Blog',
    authorId: author._id || author.id,
    authorName: author.name || 'Author',
    categoryIds: [category._id || category.id],
    categoryNames: [category.name || category.label || 'Category'],
  }
}

export interface PublishBlogInput {
  locationId: string
  title: string
  description: string
  /** The renderer's `blog` target output — inline styles, no script. */
  rawHTML: string
  urlSlug: string
  imageUrl: string
  imageAltText: string
  /**
   * DRAFT BY DEFAULT, DELIBERATELY.
   *
   * This writes to a real client's public website. A generated page going
   * straight to PUBLISHED means the first time anyone reviews it is after the
   * customer's audience has already seen it.
   */
  status?: 'DRAFT' | 'PUBLISHED'
  targets?: BlogTargets
}

export interface PublishResult {
  ok: boolean
  postId?: string
  status?: string
  url?: string
  error?: string
  targets?: BlogTargets
}

/** Slug that the platform will accept: lowercase, hyphenated, no punctuation. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'untitled'
}

export async function publishAsBlogPost(input: PublishBlogInput): Promise<PublishResult> {
  const targets = input.targets ?? (await resolveBlogTargets(input.locationId))
  if ('problem' in targets) {
    return { ok: false, error: `${targets.problem} ${targets.fix}` }
  }

  const body = {
    title: input.title,
    locationId: input.locationId,
    blogId: targets.blogId,
    imageUrl: input.imageUrl,
    description: input.description,
    rawHTML: input.rawHTML,
    status: input.status || 'DRAFT',
    imageAltText: input.imageAltText,
    categories: targets.categoryIds,
    author: targets.authorId,
    urlSlug: slugify(input.urlSlug),
    publishedAt: new Date().toISOString(),
  }

  // locationId belongs in the BODY here (it is a required field of the schema),
  // so crmPostRaw is correct — crmPost would also inject it as a duplicate.
  const res = await crmPostRaw('/blogs/posts', input.locationId, body)
  const data = await readJson(res)

  if (!res.ok) {
    return {
      ok: false,
      error: `${res.status}: ${data?.message || data?._raw || 'Blog post rejected.'}`,
      targets,
    }
  }

  const post = data?.data || data?.blogPost || data
  return {
    ok: true,
    postId: post?._id || post?.id,
    status: post?.status || body.status,
    url: post?.urlSlug ? `/${post.urlSlug}` : `/${body.urlSlug}`,
    targets,
  }
}
