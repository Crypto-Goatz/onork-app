/**
 * POST /api/onboarding/scan-website — Scan a user's website and extract business data.
 *
 * Crawls the homepage + key pages, extracts:
 * - Business name, tagline, description
 * - Services/products offered
 * - Contact info (email, phone, address)
 * - Branding (colors, logo URL, fonts)
 * - Social links
 * - Industry/niche
 * - CTA text and target audience
 *
 * Uses Groq AI to analyze the raw HTML and return structured data.
 * Pre-populates onboarding fields so the user is set up in seconds.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Normalize URL
  let siteUrl = url.trim()
  if (!siteUrl.startsWith('http')) siteUrl = `https://${siteUrl}`

  try {
    // Crawl the homepage
    const pages = [siteUrl]

    // Try common pages
    const commonPaths = ['/about', '/services', '/contact', '/pricing']
    for (const path of commonPaths) {
      pages.push(`${siteUrl.replace(/\/$/, '')}${path}`)
    }

    const crawlResults: { url: string; html: string; status: number }[] = []

    for (const pageUrl of pages) {
      try {
        const res = await fetch(pageUrl, {
          headers: {
            'User-Agent': '0nCore-Scanner/1.0 (+https://0ncore.com)',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(8000),
        })

        if (res.ok) {
          const html = await res.text()
          // Take first 15k chars to stay within token limits
          crawlResults.push({ url: pageUrl, html: html.slice(0, 15000), status: res.status })
        }
      } catch {
        // Skip pages that fail
      }
    }

    if (crawlResults.length === 0) {
      return NextResponse.json({
        error: 'Could not reach the website. Please check the URL and try again.',
      }, { status: 400 })
    }

    // Extract meta tags + visible text from HTML
    const extracted = crawlResults.map(r => {
      const titleMatch = r.html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const descMatch = r.html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      const ogTitleMatch = r.html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      const ogDescMatch = r.html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
      const ogImageMatch = r.html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      const faviconMatch = r.html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i)

      // Extract colors from CSS
      const colorMatches = r.html.match(/#[0-9a-fA-F]{3,8}/g) || []
      const uniqueColors = [...new Set(colorMatches)].slice(0, 10)

      // Extract social links
      const socialPatterns = [
        { name: 'facebook', pattern: /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"']+)["']/i },
        { name: 'linkedin', pattern: /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"']+)["']/i },
        { name: 'twitter', pattern: /href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"']+)["']/i },
        { name: 'instagram', pattern: /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"']+)["']/i },
        { name: 'youtube', pattern: /href=["'](https?:\/\/(?:www\.)?youtube\.com\/[^"']+)["']/i },
        { name: 'tiktok', pattern: /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"']+)["']/i },
      ]

      const socialLinks: Record<string, string> = {}
      for (const s of socialPatterns) {
        const match = r.html.match(s.pattern)
        if (match) socialLinks[s.name] = match[1]
      }

      // Extract emails and phones
      const emailMatches = r.html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
      const phoneMatches = r.html.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || []

      // Strip HTML tags for text analysis
      const textContent = r.html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000)

      return {
        url: r.url,
        title: titleMatch?.[1] || ogTitleMatch?.[1] || '',
        description: descMatch?.[1] || ogDescMatch?.[1] || '',
        ogImage: ogImageMatch?.[1] || '',
        favicon: faviconMatch?.[1] || '',
        colors: uniqueColors,
        socialLinks,
        emails: [...new Set(emailMatches)].slice(0, 5),
        phones: [...new Set(phoneMatches)].slice(0, 3),
        textContent,
      }
    })

    // Use Groq AI to analyze and extract structured business data
    const analysisPrompt = `Analyze this website data and extract structured business information. Return ONLY valid JSON.

Website: ${siteUrl}

Page data:
${extracted.map(e => `
URL: ${e.url}
Title: ${e.title}
Description: ${e.description}
Text excerpt: ${e.textContent.slice(0, 2000)}
`).join('\n---\n')}

Emails found: ${extracted.flatMap(e => e.emails).join(', ')}
Phones found: ${extracted.flatMap(e => e.phones).join(', ')}
Social links: ${JSON.stringify(extracted[0]?.socialLinks || {})}
Colors found: ${extracted[0]?.colors?.join(', ')}

Return this exact JSON structure:
{
  "business_name": "extracted business name",
  "tagline": "their tagline or slogan",
  "description": "1-2 sentence description of what the business does",
  "industry": "their industry (e.g. Marketing Agency, SaaS, E-Commerce, Healthcare, Real Estate, Legal, etc.)",
  "services": ["service 1", "service 2", "service 3"],
  "target_audience": "who their customers are",
  "contact_email": "primary email or null",
  "contact_phone": "primary phone or null",
  "address": "physical address or null",
  "brand_colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" },
  "logo_url": "URL to logo image or null",
  "social_links": { "facebook": "url", "linkedin": "url", "twitter": "url", "instagram": "url" },
  "cta_text": "their main call-to-action text",
  "tone": "professional|casual|authoritative|friendly|bold",
  "content_topics": ["topic 1", "topic 2", "topic 3"]
}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a business data extraction AI. Return only valid JSON, no markdown, no explanation.' },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    })

    let businessData: Record<string, unknown> = {}

    if (groqRes.ok) {
      const groqData = await groqRes.json()
      const content = groqData.choices?.[0]?.message?.content
      if (content) {
        try {
          businessData = JSON.parse(content)
        } catch {
          // Fallback to raw extraction
        }
      }
    }

    // Merge AI analysis with raw extraction
    const result = {
      business_name: businessData.business_name || extracted[0]?.title?.split('|')[0]?.split('-')[0]?.trim() || '',
      tagline: businessData.tagline || extracted[0]?.description || '',
      description: businessData.description || '',
      industry: businessData.industry || '',
      services: (businessData.services as string[]) || [],
      target_audience: (businessData.target_audience as string) || '',
      contact_email: (businessData.contact_email as string) || extracted.flatMap(e => e.emails)[0] || '',
      contact_phone: (businessData.contact_phone as string) || extracted.flatMap(e => e.phones)[0] || '',
      address: (businessData.address as string) || '',
      brand_colors: (businessData.brand_colors as Record<string, string>) || {
        primary: extracted[0]?.colors?.[0] || '#7ed957',
        secondary: extracted[0]?.colors?.[1] || '#111827',
        accent: extracted[0]?.colors?.[2] || '#ff6b35',
      },
      logo_url: (businessData.logo_url as string) || extracted[0]?.ogImage || '',
      favicon_url: extracted[0]?.favicon || '',
      social_links: (businessData.social_links as Record<string, string>) || extracted[0]?.socialLinks || {},
      cta_text: (businessData.cta_text as string) || '',
      tone: (businessData.tone as string) || 'professional',
      content_topics: (businessData.content_topics as string[]) || [],
      site_url: siteUrl,
      pages_scanned: crawlResults.length,
    }

    // Save to profile for pre-population
    await admin
      .from('profiles')
      .update({
        business_name: result.business_name || undefined,
        website_url: siteUrl,
        website_scan: result,
      })
      .eq('id', user.id)

    return NextResponse.json({ scan: result })
  } catch (err) {
    console.error('[scan-website] Error:', err)
    return NextResponse.json({
      error: `Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    }, { status: 500 })
  }
}
