import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function verifyAdmin(): Promise<{ ok: boolean; error?: string }> {
  const serverClient = await createServerClient()
  const { data: { session } } = await serverClient.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = getAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { ok: false, error: 'Not admin' }
  return { ok: true }
}

export async function GET(request: Request) {
  const auth = await verifyAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'stats'
  const admin = getAdmin()

  try {
    switch (action) {
      case 'tables': {
        // List all tables via RPC or information_schema
        const { data, error } = await admin.rpc('get_table_stats')
        if (error) {
          // Fallback: list known tables
          const knownTables = [
            'profiles', 'customers', 'pins', 'executions',
            'training_sources', 'training_pairs', 'training_datasets',
            'training_exports', 'training_runs', 'training_feed_config',
            'council_knowledge', 'council_members', 'council_sessions',
            'council_votes', 'council_debates',
            'community_threads', 'community_posts', 'community_groups',
            'community_votes', 'community_badges', 'community_user_badges',
            'personas', 'onboarding_progress',
            'workflows', 'workflow_executions', 'workflow_templates',
            'marketplace_listings', 'marketplace_purchases',
            'sxo_sites', 'sxo_audits', 'sxo_reports',
            'conversations', 'messages',
            'files', 'file_shares',
            'invoices', 'payments', 'subscriptions',
            'integrations', 'integration_configs',
            'notifications', 'activity_log',
            'contacts', 'contact_tags', 'contact_notes',
            'pipeline_stages', 'pipeline_deals',
            'calendar_events', 'calendar_bookings',
            'email_templates', 'email_campaigns', 'email_sends',
            'social_accounts', 'social_posts', 'social_analytics',
            'api_keys', 'webhooks', 'webhook_logs',
          ]

          const tableData: { name: string; row_count: number; group: string }[] = []

          for (const table of knownTables) {
            try {
              const { count } = await admin.from(table).select('*', { count: 'exact', head: true })
              tableData.push({
                name: table,
                row_count: count || 0,
                group: table.split('_')[0],
              })
            } catch {
              // Table doesn't exist, skip
            }
          }

          return NextResponse.json({ tables: tableData })
        }

        return NextResponse.json({ tables: data || [] })
      }

      case 'table_data': {
        const table = searchParams.get('table')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 })

        const { data, error, count } = await admin
          .from(table)
          .select('*', { count: 'exact' })
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false })

        if (error) {
          // Try without ordering
          const fallback = await admin
            .from(table)
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1)
          return NextResponse.json({
            table,
            rows: fallback.data || [],
            total: fallback.count || 0,
            offset,
            limit,
          })
        }

        return NextResponse.json({
          table,
          rows: data || [],
          total: count || 0,
          offset,
          limit,
        })
      }

      case 'stats': {
        const [profiles, training_sources, training_pairs, council_knowledge] = await Promise.all([
          admin.from('profiles').select('id', { count: 'exact', head: true }),
          admin.from('training_sources').select('id', { count: 'exact', head: true }),
          admin.from('training_pairs').select('id', { count: 'exact', head: true }),
          admin.from('council_knowledge').select('id', { count: 'exact', head: true }),
        ])

        return NextResponse.json({
          stats: {
            total_users: profiles.count || 0,
            total_training_sources: training_sources.count || 0,
            total_training_pairs: training_pairs.count || 0,
            total_knowledge: council_knowledge.count || 0,
          },
        })
      }

      case 'users': {
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        const { data, count } = await admin
          .from('profiles')
          .select('*', { count: 'exact' })
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false })

        return NextResponse.json({
          users: data || [],
          total: count || 0,
          offset,
          limit,
        })
      }

      case 'training': {
        const [sources, pairs, datasets, knowledge, runs] = await Promise.all([
          admin.from('training_sources').select('id, title, source_type, status, token_count, created_at').order('created_at', { ascending: false }).limit(10),
          admin.from('training_pairs').select('id, user_input, assistant_output, domain, quality_score, approved, human_reviewed, created_at').order('created_at', { ascending: false }).limit(10),
          admin.from('training_datasets').select('*').order('created_at', { ascending: false }),
          admin.from('council_knowledge').select('id, composite_score').limit(100),
          admin.from('training_runs').select('*').order('created_at', { ascending: false }).limit(10),
        ])

        const feedSources = [
          { id: 'hn-ai', name: 'Hacker News (AI/LLM/MCP)', status: 'active' },
          { id: 'devto-ai', name: 'Dev.to (AI)', status: 'active' },
          { id: 'devto-mcp', name: 'Dev.to (MCP)', status: 'active' },
          { id: 'coingecko', name: 'CoinGecko Global', status: 'active' },
          { id: 'reddit-ai', name: 'Reddit r/artificial', status: 'planned' },
          { id: 'reddit-llm', name: 'Reddit r/LocalLLaMA', status: 'planned' },
          { id: 'arxiv-ai', name: 'ArXiv AI Papers', status: 'planned' },
          { id: 'gh-trending', name: 'GitHub Trending AI', status: 'planned' },
          { id: 'producthunt', name: 'Product Hunt AI', status: 'planned' },
          { id: 'techcrunch', name: 'TechCrunch AI', status: 'planned' },
          { id: 'anthropic-blog', name: 'Anthropic Blog', status: 'planned' },
        ]

        const avgScore = (knowledge.data || []).length > 0
          ? Math.round((knowledge.data || []).reduce((s, k) => s + Number(k.composite_score || 0), 0) / knowledge.data!.length * 100) / 100
          : 0

        return NextResponse.json({
          training: {
            sources: { total: sources.count || (sources.data || []).length, recent: sources.data || [] },
            pairs: { total: pairs.count || (pairs.data || []).length, recent: pairs.data || [] },
            datasets: datasets.data || [],
            feeds: feedSources,
            knowledge: { total: (knowledge.data || []).length, avg_score: avgScore },
            runs: runs.data || [],
          },
        })
      }

      case 'ecosystem': {
        return NextResponse.json({
          ecosystem: {
            products: [
              { name: '0nMCP', type: 'npm', url: 'https://www.npmjs.com/package/0nmcp', github: 'https://github.com/0nork/0nMCP', tools: 1171, version: 'v2.5.0' },
              { name: '0nmcp.com', type: 'website', url: 'https://0nmcp.com', vercel_id: 'prj_Ccq53WXdb5CQd4iIBRR0qr4QToge' },
              { name: '0nCore', type: 'app', url: 'https://0ncore.com', vercel_id: 'prj_OJ0gi5HItdtUmQYclXirYk1BSJnt' },
              { name: '0nCommand', type: 'app', url: 'https://0n-command-center.vercel.app' },
              { name: 'Marketplace', type: 'marketplace', url: 'https://marketplace.rocketclients.com', vercel_id: 'prj_fWdT7RGwoK01RqhxNN6M7USSCIZj' },
              { name: 'social0n', type: 'extension', github: 'https://github.com/0nork/0n-linkedin' },
            ],
            supabase: [
              { id: 'pwujhhmlrtxjmjzyttwn', name: '0nmcp.com + Marketplace', url: 'https://supabase.com/dashboard/project/pwujhhmlrtxjmjzyttwn' },
              { id: 'yaehbwimocvvnnlojkxe', name: '0nork Customers', url: 'https://supabase.com/dashboard/project/yaehbwimocvvnnlojkxe' },
              { id: 'rtwtaisjtvdajrdyivkn', name: 'Rocket+ Master DB', url: 'https://supabase.com/dashboard/project/rtwtaisjtvdajrdyivkn' },
            ],
            links: {
              stripe: 'https://dashboard.stripe.com',
              vercel: 'https://vercel.com/cryptogoatz',
              github_0nork: 'https://github.com/0nork',
              github_cryptogoatz: 'https://github.com/Crypto-Goatz',
              crm: 'https://app.clientclub.net',
              npm: 'https://www.npmjs.com/package/0nmcp',
            },
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
