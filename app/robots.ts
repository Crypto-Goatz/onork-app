import type { MetadataRoute } from 'next'

const PRIVATE = [
  '/vip/',         // VIP client dashboards (live customer data)
  '/dashboard/',
  '/console/',
  '/canvas/',
  '/welcome/',
  '/api/',
  '/auth/',
  '/admin/',
]

export default function robots(): MetadataRoute.Robots {
  const rules = (ua: string) => ({
    userAgent: ua,
    allow: '/',
    disallow: PRIVATE,
  })
  return {
    rules: [
      rules('*'),
      rules('GPTBot'),
      rules('ChatGPT-User'),
      rules('Claude-Web'),
      rules('Anthropic-AI'),
      rules('PerplexityBot'),
    ],
    sitemap: 'https://0ncore.com/sitemap.xml',
  }
}
