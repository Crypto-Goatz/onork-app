import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

// GET /api/google/analytics — Fetch GA4 reports using the user's own OAuth tokens
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const report = searchParams.get('report') || 'overview'
  const startDate = searchParams.get('startDate') || '30daysAgo'
  const endDate = searchParams.get('endDate') || 'today'

  // Get user's Google connection
  const { data: connection } = await supabase
    .from('user_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('status', 'active')
    .single()

  // Fallback: check legacy google_tokens in profiles
  let accessToken: string | null = null
  let refreshToken: string | null = null
  let propertyId: string | null = null

  if (connection) {
    accessToken = connection.access_token
    refreshToken = connection.refresh_token
    propertyId = searchParams.get('property') || connection.metadata?.ga4_property_id || null
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_tokens')
      .eq('id', user.id)
      .single()

    if (profile?.google_tokens?.access_token) {
      accessToken = profile.google_tokens.access_token
      refreshToken = profile.google_tokens.refresh_token
    }
  }

  if (!accessToken) {
    return NextResponse.json({
      error: 'Google not connected. Go to Settings > Connected Accounts to connect your Google account.',
      code: 'NOT_CONNECTED',
    }, { status: 403 })
  }

  if (!propertyId) {
    propertyId = searchParams.get('property') || null
  }

  if (!propertyId) {
    return NextResponse.json({
      error: 'No GA4 property selected. Go to Settings > Connected Accounts to select your GA4 property.',
      code: 'NO_PROPERTY',
    }, { status: 400 })
  }

  // Create authenticated client from user's tokens
  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  // Auto-refresh if needed
  oauth.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      // Update the stored token
      if (connection) {
        await supabase
          .from('user_connections')
          .update({
            access_token: tokens.access_token,
            expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
            last_used_at: new Date().toISOString(),
            health_status: 'healthy',
            consecutive_failures: 0,
          })
          .eq('id', connection.id)
      } else {
        // Update legacy field
        const { data: profile } = await supabase
          .from('profiles')
          .select('google_tokens')
          .eq('id', user.id)
          .single()

        if (profile?.google_tokens) {
          await supabase
            .from('profiles')
            .update({
              google_tokens: {
                ...profile.google_tokens,
                access_token: tokens.access_token,
                expiry_date: tokens.expiry_date,
              },
            })
            .eq('id', user.id)
        }
      }
    }
  })

  const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth })
  const property = `properties/${propertyId}`

  try {
    switch (report) {
      case 'overview': {
        const [traffic, pages, sources, devices] = await Promise.all([
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
              limit: '20',
            },
          }),
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
              limit: '10',
            },
          }),
          analyticsData.properties.runReport({
            property,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'deviceCategory' }],
              metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
            },
          }),
        ])

        // Mark connection as used
        if (connection) {
          await supabase
            .from('user_connections')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', connection.id)
        }

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
            metrics: [{ name: 'activeUsers' }],
            dimensions: [{ name: 'pagePath' }],
            limit: '20',
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
            limit: '30',
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
            limit: '30',
          },
        })
        return NextResponse.json({ geo: geo.data })
      }

      default:
        return NextResponse.json({ error: `Unknown report: ${report}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[google/analytics] Error:', err)

    // Handle specific OAuth errors
    const message = err instanceof Error ? err.message : 'Unknown'

    if (message.includes('invalid_grant') || message.includes('Token has been expired')) {
      // Mark connection as expired
      if (connection) {
        await supabase
          .from('user_connections')
          .update({
            status: 'expired',
            health_status: 'unhealthy',
            last_error: message,
          })
          .eq('id', connection.id)
      }
      return NextResponse.json({
        error: 'Google connection expired. Please reconnect in Settings > Connected Accounts.',
        code: 'TOKEN_EXPIRED',
      }, { status: 401 })
    }

    if (message.includes('insufficient') || message.includes('permission')) {
      return NextResponse.json({
        error: 'You don\'t have access to this GA4 property. Make sure your Google account has at least Viewer access in Google Analytics.',
        code: 'NO_ACCESS',
      }, { status: 403 })
    }

    return NextResponse.json({
      error: `Analytics error: ${message}`,
    }, { status: 500 })
  }
}
