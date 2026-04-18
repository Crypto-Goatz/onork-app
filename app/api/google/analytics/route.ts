import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnalyticsDataClient, DEFAULT_GA4_PROPERTY } from '@/lib/google/auth'

// GET /api/google/analytics — Fetch GA4 reports
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const report = searchParams.get('report') || 'overview'
  const propertyId = searchParams.get('property') || DEFAULT_GA4_PROPERTY
  const startDate = searchParams.get('startDate') || '30daysAgo'
  const endDate = searchParams.get('endDate') || 'today'

  const analyticsData = getAnalyticsDataClient()
  const property = `properties/${propertyId}`

  try {
    switch (report) {
      case 'overview': {
        const [traffic, pages, sources, devices] = await Promise.all([
          // Traffic overview
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
                { name: 'newUsers' },
                { name: 'engagedSessions' },
                { name: 'conversions' },
              ],
            },
          }),
          // Top pages
          analyticsData.properties.runReport({
            property,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'pagePath' }],
              metrics: [
                { name: 'screenPageViews' },
                { name: 'activeUsers' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
              ],
              orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
              limit: 20,
            },
          }),
          // Traffic sources
          analyticsData.properties.runReport({
            property,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'sessionDefaultChannelGroup' }],
              metrics: [
                { name: 'sessions' },
                { name: 'activeUsers' },
                { name: 'conversions' },
              ],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: 10,
            },
          }),
          // Devices
          analyticsData.properties.runReport({
            property,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'deviceCategory' }],
              metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
            },
          }),
        ])

        return NextResponse.json({
          traffic: traffic.data,
          pages: pages.data,
          sources: sources.data,
          devices: devices.data,
        })
      }

      case 'realtime': {
        const realtime = await analyticsData.properties.runRealtimeReport({
          property,
          requestBody: {
            metrics: [
              { name: 'activeUsers' },
            ],
            dimensions: [
              { name: 'pagePath' },
            ],
            limit: 20,
          },
        })
        return NextResponse.json({ realtime: realtime.data })
      }

      case 'conversions': {
        const conversions = await analyticsData.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'eventName' }],
            metrics: [
              { name: 'eventCount' },
              { name: 'conversions' },
              { name: 'totalRevenue' },
            ],
            dimensionFilter: {
              filter: {
                fieldName: 'eventName',
                inListFilter: {
                  values: ['purchase', 'sign_up', 'generate_lead', 'begin_checkout', 'add_to_cart', 'page_view', 'scroll', 'click', 'first_visit'],
                },
              },
            },
            orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          },
        })
        return NextResponse.json({ conversions: conversions.data })
      }

      case 'daily': {
        const daily = await analyticsData.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [
              { name: 'activeUsers' },
              { name: 'sessions' },
              { name: 'screenPageViews' },
              { name: 'conversions' },
            ],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
          },
        })
        return NextResponse.json({ daily: daily.data })
      }

      case 'landing-pages': {
        const landing = await analyticsData.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'landingPage' }],
            metrics: [
              { name: 'sessions' },
              { name: 'activeUsers' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' },
              { name: 'conversions' },
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 30,
          },
        })
        return NextResponse.json({ landingPages: landing.data })
      }

      case 'geo': {
        const geo = await analyticsData.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'country' }, { name: 'region' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
            limit: 30,
          },
        })
        return NextResponse.json({ geo: geo.data })
      }

      default:
        return NextResponse.json({ error: `Unknown report: ${report}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[google/analytics] Error:', err)
    return NextResponse.json({
      error: `Analytics error: ${err instanceof Error ? err.message : 'Unknown'}`,
    }, { status: 500 })
  }
}
