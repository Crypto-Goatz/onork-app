import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWebmastersClient } from '@/lib/google/auth'

const DEFAULT_SITE = process.env.SEARCH_CONSOLE_SITE || 'sc-domain:0ncore.com'

// GET /api/google/search-console — Search Console data
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const report = searchParams.get('report') || 'performance'
  const siteUrl = searchParams.get('site') || DEFAULT_SITE
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

  const webmasters = getWebmastersClient()

  try {
    switch (report) {
      case 'performance': {
        // Top queries
        const queries = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['query'],
            rowLimit: 50,
            dataState: 'all',
          },
        })

        // Top pages
        const pages = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['page'],
            rowLimit: 50,
            dataState: 'all',
          },
        })

        // Daily trend
        const daily = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['date'],
            dataState: 'all',
          },
        })

        return NextResponse.json({
          queries: queries.data.rows || [],
          pages: pages.data.rows || [],
          daily: daily.data.rows || [],
          totals: {
            clicks: queries.data.rows?.reduce((s, r) => s + (r.clicks || 0), 0) || 0,
            impressions: queries.data.rows?.reduce((s, r) => s + (r.impressions || 0), 0) || 0,
          },
        })
      }

      case 'queries': {
        const page = searchParams.get('page') || undefined
        const result = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['query'],
            dimensionFilterGroups: page ? [{
              filters: [{ dimension: 'page', expression: page }],
            }] : undefined,
            rowLimit: 100,
            dataState: 'all',
          },
        })
        return NextResponse.json({ queries: result.data.rows || [] })
      }

      case 'pages': {
        const query = searchParams.get('query') || undefined
        const result = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['page'],
            dimensionFilterGroups: query ? [{
              filters: [{ dimension: 'query', expression: query }],
            }] : undefined,
            rowLimit: 100,
            dataState: 'all',
          },
        })
        return NextResponse.json({ pages: result.data.rows || [] })
      }

      case 'countries': {
        const result = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['country'],
            rowLimit: 50,
            dataState: 'all',
          },
        })
        return NextResponse.json({ countries: result.data.rows || [] })
      }

      case 'devices': {
        const result = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['device'],
            dataState: 'all',
          },
        })
        return NextResponse.json({ devices: result.data.rows || [] })
      }

      case 'sitemaps': {
        const result = await webmasters.sitemaps.list({ siteUrl })
        return NextResponse.json({ sitemaps: result.data.sitemap || [] })
      }

      case 'indexing': {
        // URL inspection requires different API but we can get indexing status from sitemaps
        const result = await webmasters.sitemaps.list({ siteUrl })
        return NextResponse.json({ indexing: result.data.sitemap || [] })
      }

      default:
        return NextResponse.json({ error: `Unknown report: ${report}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[google/search-console] Error:', err)
    return NextResponse.json({
      error: `Search Console error: ${err instanceof Error ? err.message : 'Unknown'}`,
    }, { status: 500 })
  }
}
