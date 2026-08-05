import { NextResponse } from 'next/server'
import { resolveBlogTargets } from '@/lib/crm/blog'
import { crmGet } from '@/lib/crm'

/**
 * What can this account actually receive?
 *
 * WHY THIS EXISTS AS ITS OWN ROUTE. `POST /blogs/posts` requires a blog site, an
 * author and a category — and none of the three can be created through the API.
 * Miss any one and the platform answers with a bare 422 that reads like a
 * permissions failure, sending you off to check scopes for twenty minutes.
 *
 * Asking first turns that into a sentence: "this blog has no author, add one in
 * the CRM." Cheap to call, and it is the difference between a promise we can
 * keep and one we cannot.
 */
export async function GET(req: Request) {
  const locationId = new URL(req.url).searchParams.get('locationId')
  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required.' }, { status: 400 })
  }

  const blog = await resolveBlogTargets(locationId)

  // The store has no equivalent prerequisite chain — products can be created
  // against a bare location — so this is a reachability check, not a readiness one.
  let store: { ready: boolean; detail: string }
  try {
    const res = await crmGet('/products/?limit=1', locationId)
    store = res.ok
      ? { ready: true, detail: 'Products API reachable. Products, prices and collections can be created.' }
      : { ready: false, detail: `Products API returned ${res.status}. Check the install carries products.write.` }
  } catch (err: any) {
    store = { ready: false, detail: err?.message || 'Products API unreachable.' }
  }

  return NextResponse.json({
    locationId,
    blog:
      'problem' in blog
        ? { ready: false, problem: blog.problem, fix: blog.fix }
        : {
            ready: true,
            blogId: blog.blogId,
            blogName: blog.blogName,
            author: blog.authorName,
            categories: blog.categoryNames,
          },
    store,
    // Stated plainly so nobody builds a roadmap on a capability that does not exist.
    funnelPages: {
      ready: false,
      detail:
        'Funnels and funnel pages are read-only across the whole API — /funnels/page and /funnels/funnel/list are GET only. No create endpoint exists for anyone. Pages must be hosted by us, published as a blog post, or embedded via a widget.',
    },
  })
}
