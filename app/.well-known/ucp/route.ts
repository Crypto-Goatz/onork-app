import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

export async function GET() {
  return NextResponse.json({
    ucp_version: '1.0',
    name: '0nCore Marketplace',
    description: 'AI apps, automations, and done-for-you services. Pay once, deploy anywhere.',
    operator: {
      name: 'RocketOpp LLC',
      url: 'https://0ncore.com',
      email: 'support@0ncore.com',
      logo: `${BASE_URL}/logo.png`,
    },
    capabilities: {
      catalog: { endpoint: `${BASE_URL}/api/ucp/catalog`, methods: ['GET'] },
      checkout: { endpoint: `${BASE_URL}/api/ucp/checkout`, methods: ['POST'] },
      fulfillment: { endpoint: `${BASE_URL}/api/ucp/fulfillment`, methods: ['POST'] },
      identity: { endpoint: `${BASE_URL}/api/auth/whoami`, methods: ['GET'] },
      orders: { endpoint: `${BASE_URL}/api/ucp/orders`, methods: ['GET'] },
    },
    payment_handlers: ['stripe'],
    currencies: ['USD'],
    categories: [
      { slug: 'website-compliance', name: 'Website Compliance' },
      { slug: 'seo-optimization', name: 'SEO & CRO9' },
      { slug: 'ai-content-generation', name: 'AI Content' },
      { slug: 'crm-setup', name: 'CRM Setup' },
      { slug: 'wordpress-management', name: 'WordPress' },
      { slug: 'business-automation', name: 'Automation' },
      { slug: 'marketplace-app', name: 'Marketplace Apps' },
    ],
    fulfillment_types: [
      'hipaa_scan',
      'cro9_audit',
      'blog_post',
      'crm_setup',
      'wordpress_management',
      'custom_automation',
      '0n_app',
      'marketplace_app',
      'manual',
    ],
    contact: {
      support: 'support@0ncore.com',
      billing: 'billing@0ncore.com',
    },
    terms_url: `${BASE_URL}/terms`,
    privacy_url: `${BASE_URL}/privacy`,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
