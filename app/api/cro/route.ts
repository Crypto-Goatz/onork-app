import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnalyticsDataClient, getWebmastersClient, DEFAULT_GA4_PROPERTY } from '@/lib/google/auth'

// POST /api/cro — Run CRO9 analysis on a site
// Pulls GA4 + Search Console data, runs AI analysis, returns optimization recommendations
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    siteUrl = 'sc-domain:0ncore.com',
    propertyId = DEFAULT_GA4_PROPERTY,
    startDate = '30daysAgo',
    endDate = 'today',
    mode = 'full', // 'full' | 'quick' | 'landing-pages' | 'queries'
  } = await req.json()

  const property = `properties/${propertyId}`
  const analyticsData = getAnalyticsDataClient()
  const webmasters = getWebmastersClient()

  const scStartDate = startDate === '30daysAgo'
    ? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    : startDate
  const scEndDate = endDate === 'today'
    ? new Date().toISOString().split('T')[0]
    : endDate

  try {
    // ═══ Parallel data fetch ═══
    const [
      trafficRes,
      landingRes,
      sourcesRes,
      dailyRes,
      queriesRes,
      scPagesRes,
    ] = await Promise.all([
      // GA4: Traffic overview
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' },
            { name: 'engagedSessions' },
            { name: 'newUsers' },
          ],
        },
      }),

      // GA4: Landing pages with bounce rate
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'landingPage' }],
          metrics: [
            { name: 'sessions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' },
            { name: 'activeUsers' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 30,
        },
      }),

      // GA4: Traffic sources
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }, { name: 'conversions' }, { name: 'bounceRate' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        },
      }),

      // GA4: Daily trend
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'conversions' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
      }),

      // Search Console: Top queries
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: scStartDate,
          endDate: scEndDate,
          dimensions: ['query'],
          rowLimit: 50,
          dataState: 'all',
        },
      }).catch(() => ({ data: { rows: [] } })),

      // Search Console: Top pages
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: scStartDate,
          endDate: scEndDate,
          dimensions: ['page'],
          rowLimit: 30,
          dataState: 'all',
        },
      }).catch(() => ({ data: { rows: [] } })),
    ])

    // ═══ Extract metrics ═══
    const metrics = trafficRes.data.rows?.[0]?.metricValues || []
    const overview = {
      activeUsers: Number(metrics[0]?.value || 0),
      sessions: Number(metrics[1]?.value || 0),
      pageViews: Number(metrics[2]?.value || 0),
      bounceRate: Number(metrics[3]?.value || 0),
      avgDuration: Number(metrics[4]?.value || 0),
      conversions: Number(metrics[5]?.value || 0),
      engagedSessions: Number(metrics[6]?.value || 0),
      newUsers: Number(metrics[7]?.value || 0),
    }

    const engagementRate = overview.sessions > 0
      ? (overview.engagedSessions / overview.sessions * 100).toFixed(1)
      : '0'

    const landingPages = (landingRes.data.rows || []).map(row => ({
      page: row.dimensionValues?.[0]?.value || '',
      sessions: Number(row.metricValues?.[0]?.value || 0),
      bounceRate: Number(row.metricValues?.[1]?.value || 0),
      avgDuration: Number(row.metricValues?.[2]?.value || 0),
      conversions: Number(row.metricValues?.[3]?.value || 0),
      users: Number(row.metricValues?.[4]?.value || 0),
    }))

    const sources = (sourcesRes.data.rows || []).map(row => ({
      channel: row.dimensionValues?.[0]?.value || '',
      sessions: Number(row.metricValues?.[0]?.value || 0),
      conversions: Number(row.metricValues?.[1]?.value || 0),
      bounceRate: Number(row.metricValues?.[2]?.value || 0),
    }))

    const queries = (queriesRes.data.rows || []).map((row: any) => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }))

    // ═══ CRO9 Scoring ═══
    const scores = {
      traffic: Math.min(100, Math.round(overview.sessions / 10)),
      engagement: Math.min(100, Math.round(Number(engagementRate))),
      bounce: Math.max(0, 100 - Math.round(overview.bounceRate * 100)),
      conversion: overview.sessions > 0
        ? Math.min(100, Math.round(overview.conversions / overview.sessions * 1000))
        : 0,
      seo: Math.min(100, Math.round(queries.length * 2)),
      speed: 70, // placeholder — would need PageSpeed Insights API
    }

    const overallScore = Math.round(
      scores.traffic * 0.15 +
      scores.engagement * 0.2 +
      scores.bounce * 0.15 +
      scores.conversion * 0.25 +
      scores.seo * 0.15 +
      scores.speed * 0.1
    )

    // ═══ Auto-generate recommendations ═══
    const recommendations: { priority: 'high' | 'medium' | 'low'; category: string; title: string; description: string; impact: string }[] = []

    // High bounce pages
    const highBounceLanding = landingPages.filter(p => p.bounceRate > 0.7 && p.sessions > 5)
    if (highBounceLanding.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'CRO',
        title: `${highBounceLanding.length} landing pages have >70% bounce rate`,
        description: `Pages: ${highBounceLanding.slice(0, 3).map(p => p.page).join(', ')}. Add stronger CTAs, improve above-fold content, reduce load time.`,
        impact: `Could recover ${highBounceLanding.reduce((s, p) => s + Math.round(p.sessions * 0.3), 0)} engaged sessions/month`,
      })
    }

    // Low conversion rate
    if (overview.sessions > 50 && overview.conversions / overview.sessions < 0.02) {
      recommendations.push({
        priority: 'high',
        category: 'Conversion',
        title: 'Conversion rate below 2%',
        description: `${overview.conversions} conversions from ${overview.sessions} sessions (${(overview.conversions / overview.sessions * 100).toFixed(2)}%). Add micro-conversions, simplify forms, add social proof.`,
        impact: 'Every 1% improvement = ~' + Math.round(overview.sessions * 0.01) + ' additional conversions',
      })
    }

    // Quick win queries (position 4-20, high impressions)
    const quickWinQueries = queries.filter((q: any) => q.position >= 4 && q.position <= 20 && q.impressions > 50)
    if (quickWinQueries.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'SEO',
        title: `${quickWinQueries.length} quick-win keywords in positions 4-20`,
        description: `"${quickWinQueries[0].query}" at position ${quickWinQueries[0].position.toFixed(1)} with ${quickWinQueries[0].impressions} impressions. Optimize title tags, add internal links, improve content depth.`,
        impact: `Moving to page 1 could add ${quickWinQueries.reduce((s: number, q: any) => s + Math.round(q.impressions * 0.1), 0)} clicks/month`,
      })
    }

    // Low engagement source
    const lowEngSources = sources.filter(s => s.bounceRate > 0.8 && s.sessions > 10)
    if (lowEngSources.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Traffic Quality',
        title: `${lowEngSources.length} traffic sources with >80% bounce`,
        description: `${lowEngSources.map(s => s.channel).join(', ')} have high bounce. Review ad targeting, landing page relevance, and audience fit.`,
        impact: 'Improving source quality = higher ROI on all channels',
      })
    }

    // Missing conversions tracking
    if (overview.conversions === 0 && overview.sessions > 20) {
      recommendations.push({
        priority: 'high',
        category: 'Tracking',
        title: 'No conversions tracked',
        description: 'Set up GA4 conversion events (sign_up, purchase, generate_lead, begin_checkout). Without conversion tracking, CRO is blind.',
        impact: 'Foundation for all optimization — must fix first',
      })
    }

    // New users ratio
    if (overview.newUsers / overview.activeUsers > 0.9) {
      recommendations.push({
        priority: 'medium',
        category: 'Retention',
        title: `${Math.round(overview.newUsers / overview.activeUsers * 100)}% of users are new — low retention`,
        description: 'Add email capture, push notifications, retargeting pixels, and re-engagement campaigns to bring users back.',
        impact: 'Returning users convert 2-3x higher than new users',
      })
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return NextResponse.json({
      score: overallScore,
      scores,
      overview,
      engagementRate,
      landingPages: landingPages.slice(0, 15),
      sources,
      queries: queries.slice(0, 25),
      recommendations,
      daily: (dailyRes.data.rows || []).map(row => ({
        date: row.dimensionValues?.[0]?.value || '',
        users: Number(row.metricValues?.[0]?.value || 0),
        sessions: Number(row.metricValues?.[1]?.value || 0),
        conversions: Number(row.metricValues?.[2]?.value || 0),
      })),
      meta: {
        property: propertyId,
        site: siteUrl,
        dateRange: { startDate, endDate },
        analyzedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[cro] Analysis error:', err)
    return NextResponse.json({
      error: `CRO analysis failed: ${err instanceof Error ? err.message : 'Unknown'}`,
    }, { status: 500 })
  }
}
