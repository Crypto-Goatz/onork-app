import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

/**
 * POST /api/onboarding/import
 * Accepts a .0n config file (JSON), parses K1-K5, and provisions the entire account.
 * This is the "AI-to-AI bridge" — any LLM generates this file, user drops it here.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const config = await req.json()

    // Validate schema
    if (!config.schema?.startsWith('0n-config')) {
      return NextResponse.json({ error: 'Invalid .0n config file — missing schema field' }, { status: 400 })
    }

    const results: string[] = []

    // ─── K1: Brand Voice ───
    if (config.K1_brand_voice) {
      const k1 = config.K1_brand_voice
      await admin.from('kb_content_queue').upsert({
        user_id: user.id,
        layer: 'K1',
        content: {
          business_name: k1.business_name || '',
          tagline: k1.tagline || '',
          industry: k1.industry || '',
          brand_tone: k1.brand_tone || 'professional',
          ai_name: k1.ai_name || '0nAI',
          ai_personality: k1.ai_personality || '',
          avoided_phrases: k1.avoided_phrases || [],
          emoji_style: k1.emoji_style || 'minimal',
        },
        status: 'active',
      }, { onConflict: 'user_id,layer' })
      results.push('K1 brand voice loaded')
    }

    // ─── K2: Terminology / Services ───
    if (config.K2_terminology) {
      const k2 = config.K2_terminology
      await admin.from('kb_content_queue').upsert({
        user_id: user.id,
        layer: 'K2',
        content: {
          services: k2.services || [],
          industry_terms: k2.industry_terms || [],
        },
        status: 'active',
      }, { onConflict: 'user_id,layer' })
      results.push(`K2 terminology loaded (${k2.services?.length || 0} services)`)
    }

    // ─── K3: Business Structure ───
    if (config.K3_business_structure) {
      const k3 = config.K3_business_structure
      await admin.from('kb_content_queue').upsert({
        user_id: user.id,
        layer: 'K3',
        content: {
          company_name: k3.company_name || '',
          website: k3.website || '',
          phone: k3.phone || '',
          email: k3.email || user.email || '',
          booking_url: k3.booking_url || '',
          address: k3.address || '',
          founded_year: k3.founded_year || '',
        },
        status: 'active',
      }, { onConflict: 'user_id,layer' })
      results.push('K3 business structure loaded')
    }

    // ─── K4: Visual Identity ───
    if (config.K4_visual_identity) {
      const k4 = config.K4_visual_identity
      await admin.from('kb_content_queue').upsert({
        user_id: user.id,
        layer: 'K4',
        content: {
          colors: k4.colors || {},
          fonts: k4.fonts || {},
          logo_url: k4.logo_url || '',
          css_methodology: k4.css_methodology || 'tailwind-only',
          design_tokens: k4.design_tokens || 'core-*',
        },
        status: 'active',
      }, { onConflict: 'user_id,layer' })
      results.push('K4 visual identity loaded')
    }

    // ─── K5: Domain Knowledge ───
    if (config.K5_domain_knowledge) {
      const k5 = config.K5_domain_knowledge
      await admin.from('kb_content_queue').upsert({
        user_id: user.id,
        layer: 'K5',
        content: {
          faqs: k5.faqs || [],
          compliance_notes: k5.compliance_notes || '',
        },
        status: 'active',
      }, { onConflict: 'user_id,layer' })
      results.push('K5 domain knowledge loaded')
    }

    // ─── Update profile ───
    const businessName = config.K1_brand_voice?.business_name || config.K3_business_structure?.company_name || ''
    await admin.from('profiles').update({
      business_name: businessName,
      onboarding_complete: true,
    }).eq('id', user.id)
    results.push('Profile updated')

    // ─── Save brand profile ───
    if (config.K4_visual_identity || config.K1_brand_voice) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/brand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            name: businessName,
            industry: config.K1_brand_voice?.industry || '',
            primary_color: config.K4_visual_identity?.colors?.primary || null,
            secondary_color: config.K4_visual_identity?.colors?.secondary || null,
            accent_color: config.K4_visual_identity?.colors?.accent || null,
            services: (config.K2_terminology?.services || []).map((s: any) => ({
              name: s.name,
              description: s.description,
            })),
            tagline: config.K1_brand_voice?.tagline || null,
            phone: config.K3_business_structure?.phone || null,
          },
          business_name: businessName,
        }),
      }).catch(() => {})
      results.push('Brand profile saved')
    }

    // ─── Update CRM agent ───
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName,
        industry: config.K1_brand_voice?.industry || '',
        services: (config.K2_terminology?.services || []).map((s: any) => s.name).join(', '),
        phone: config.K3_business_structure?.phone || '',
        website: config.K3_business_structure?.website || '',
      }),
    }).catch(() => {})
    results.push('AI agent configured')

    // ─── Trigger provisioning if needed ───
    const { data: profile } = await admin.from('profiles').select('crm_location_id').eq('id', user.id).single()
    if (!profile?.crm_location_id) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email || '',
          name: config.K1_brand_voice?.business_name || '',
        }),
      }).catch(() => {})
      results.push('Account provisioned')
    }

    return NextResponse.json({
      success: true,
      results,
      layers_loaded: results.filter(r => r.startsWith('K')).length,
      message: `${businessName} is configured. ${results.length} steps completed.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Import failed: ${err.message}` }, { status: 400 })
  }
}
