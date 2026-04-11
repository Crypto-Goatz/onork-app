/**
 * 0nCore RSS Feed — aggregates CRM changelog + 0nCore updates
 * GET /api/feed — returns RSS XML
 * GET /api/feed?format=json — returns JSON
 */

import { NextRequest } from 'next/server'

const CRM_CHANGELOG_RSS = 'https://ideas.gohighlevel.com/api/changelog/feed.rss'

interface FeedItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: 'crm' | '0ncore'
  category?: string
}

async function fetchCrmChangelog(): Promise<FeedItem[]> {
  try {
    const res = await fetch(CRM_CHANGELOG_RSS, {
      next: { revalidate: 3600 }, // Cache 1 hour
    })
    if (!res.ok) return []

    const xml = await res.text()
    const items: FeedItem[] = []

    // Simple XML parsing for RSS items
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
    for (const itemXml of itemMatches.slice(0, 20)) {
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || itemXml.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const desc = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        || itemXml.match(/<description>(.*?)<\/description>/)?.[1] || ''
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

      if (title) {
        items.push({
          title,
          link,
          description: desc.replace(/<[^>]*>/g, '').slice(0, 300),
          pubDate,
          source: 'crm',
          category: 'CRM Update',
        })
      }
    }

    return items
  } catch {
    return []
  }
}

function generate0nCoreItems(): FeedItem[] {
  return [
    {
      title: '0nCore v1.0 — AI-Powered CRM with K-Layer Brain',
      link: 'https://0ncore.com/home',
      description: '0nCore launches with 1,554 tools, 96 services, K-Layer knowledge system, and full CRM integration. Tiers from Free to Penthouse ($499/mo).',
      pubDate: new Date('2026-04-10').toUTCString(),
      source: '0ncore',
      category: 'Release',
    },
    {
      title: '0nAI Chatbot — Groq-Powered Lead Capture Widget',
      link: 'https://0ncore.com/home',
      description: 'Public-facing AI chatbot with full product knowledge. Captures leads directly to CRM. Available for $8/mo per user.',
      pubDate: new Date('2026-04-11').toUTCString(),
      source: '0ncore',
      category: 'Feature',
    },
    {
      title: 'Command Library v2.0 — 50 Commands for Claude & Slack',
      link: 'https://0nmcp.com/commands',
      description: '50 copy-paste commands across 9 categories. Works in Claude Desktop, Claude Code, and Slack. 25 slash commands live.',
      pubDate: new Date('2026-04-10').toUTCString(),
      source: '0ncore',
      category: 'Feature',
    },
  ]
}

function toRssXml(items: FeedItem[]): string {
  const itemsXml = items.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <category>${item.category || item.source}</category>
      <source url="https://0ncore.com/api/feed">${item.source === 'crm' ? 'CRM Changelog' : '0nCore'}</source>
    </item>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>0nCore Feed — Platform + CRM Updates</title>
    <link>https://0ncore.com</link>
    <description>Combined feed of 0nCore platform updates and CRM changelog. Stay current on features, API changes, and integrations.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://0ncore.com/api/feed" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://0ncore.com/brand/on-black.png</url>
      <title>0nCore</title>
      <link>https://0ncore.com</link>
    </image>
${itemsXml}
  </channel>
</rss>`
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format')

  const [crmItems, coreItems] = await Promise.all([
    fetchCrmChangelog(),
    Promise.resolve(generate0nCoreItems()),
  ])

  // Merge and sort by date (newest first)
  const allItems = [...crmItems, ...coreItems].sort((a, b) =>
    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  )

  if (format === 'json') {
    return Response.json({
      title: '0nCore Feed',
      items: allItems,
      sources: {
        crm: crmItems.length,
        '0ncore': coreItems.length,
      },
      lastUpdated: new Date().toISOString(),
    })
  }

  return new Response(toRssXml(allItems), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
