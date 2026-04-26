// GET /api/cron/crm-changelog — Fetch CRM changelog RSS, detect new entries, notify Mike
// Cron: daily at 9am ET → { "path": "/api/cron/crm-changelog", "schedule": "0 13 * * *" }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RSS_URL = 'https://ideas.gohighlevel.com/api/changelog/feed.rss'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface ChangelogEntry {
  title: string
  link: string
  pubDate: string
  description: string
  category?: string
}

function parseRSS(xml: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  const items = xml.split('<item>').slice(1)

  for (const item of items) {
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
    const desc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] || item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || ''
    const category = item.match(/<category>(.*?)<\/category>/)?.[1] || ''

    entries.push({
      title: title.trim(),
      link: link.trim(),
      pubDate: pubDate.trim(),
      description: desc.trim().slice(0, 500),
      category: category.trim(),
    })
  }

  return entries
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch RSS
    const rssRes = await fetch(RSS_URL)
    if (!rssRes.ok) {
      return NextResponse.json({ error: `RSS fetch failed: ${rssRes.status}` }, { status: 502 })
    }
    const xml = await rssRes.text()
    const entries = parseRSS(xml)

    if (entries.length === 0) {
      return NextResponse.json({ message: 'No entries found in RSS', entries: 0 })
    }

    // Get last check timestamp
    const { data: lastCheck } = await supabase
      .from('dashboard_notifications')
      .select('created_at')
      .eq('title', 'CRM Changelog Update')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastCheckDate = lastCheck?.created_at ? new Date(lastCheck.created_at) : new Date(0)

    // Filter to new entries only
    const newEntries = entries.filter(e => {
      const entryDate = new Date(e.pubDate)
      return entryDate > lastCheckDate
    })

    if (newEntries.length === 0) {
      return NextResponse.json({ message: 'No new changelog entries', total: entries.length, new: 0 })
    }

    // Build summary
    const summary = newEntries.map(e => `- **${e.title}** (${new Date(e.pubDate).toLocaleDateString()})\n  ${e.description.slice(0, 150)}...`).join('\n')

    // Notify via dashboard
    await supabase.from('dashboard_notifications').insert({
      type: 'info',
      title: 'CRM Changelog Update',
      message: `${newEntries.length} new CRM update${newEntries.length > 1 ? 's' : ''}:\n\n${summary}`,
      metadata: {
        entries: newEntries,
        feed_url: RSS_URL,
        checked_at: new Date().toISOString(),
      },
    })

    // Also send to Slack if configured
    const slackWebhook = process.env.SLACK_WEBHOOK_URL
    if (slackWebhook) {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔔 *CRM Changelog* — ${newEntries.length} new update${newEntries.length > 1 ? 's' : ''}`,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: `CRM Changelog — ${newEntries.length} New Updates` } },
            ...newEntries.slice(0, 5).map(e => ({
              type: 'section',
              text: { type: 'mrkdwn', text: `*<${e.link}|${e.title}>*\n${e.description.slice(0, 200)}` },
            })),
          ],
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      message: `${newEntries.length} new changelog entries detected`,
      total: entries.length,
      new: newEntries.length,
      entries: newEntries,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
