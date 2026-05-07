import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

/**
 * POST /api/migrate/import
 * Imports data from an external platform into 0nCore.
 * Body: { platform: 'brevo' | etc, apiKey: string }
 *
 * Flow:
 * 1. Fetch contacts from source platform
 * 2. Create/update contacts in CRM
 * 3. Import lists as tags
 * 4. Generate .0n migration file
 * 5. Seed K-layers with imported data
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { platform, apiKey } = await req.json()
  if (!platform || !apiKey) return NextResponse.json({ error: 'Missing platform or apiKey' }, { status: 400 })

  const results: string[] = []

  try {
    // Get user's CRM location
    const { data: profile } = await admin
      .from('profiles')
      .select('crm_location_id, crm_contact_id')
      .eq('id', user.id)
      .single()

    const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID || ''
    const crmPit = process.env.CRM_PIT || ''

    if (platform === 'brevo') {
      const headers = { 'api-key': apiKey, 'Content-Type': 'application/json' }
      const base = 'https://api.brevo.com/v3'

      // 1. Fetch contacts (first 100)
      const contactsRes = await fetch(`${base}/contacts?limit=100&offset=0`, { headers })
      const contactsData = await contactsRes.json()
      const contacts = contactsData.contacts || []
      results.push(`Fetched ${contacts.length} contacts from Brevo`)

      // 2. Import contacts into CRM
      if (crmPit && locationId && contacts.length > 0) {
        let imported = 0
        let skipped = 0

        for (const contact of contacts.slice(0, 50)) {
          try {
            const email = contact.email
            if (!email) { skipped++; continue }

            // Check if contact exists
            const searchRes = await fetch(`${CRM_API}/contacts/search`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${crmPit}`,
                'Content-Type': 'application/json',
                'Version': CRM_VERSION,
              },
              body: JSON.stringify({
                locationId,
                filters: [{ field: 'email', operator: 'eq', value: email }],
              }),
            })
            const searchData = await searchRes.json()

            if (searchData.contacts?.length > 0) {
              skipped++
              continue
            }

            // Create contact
            const name = [contact.attributes?.FIRSTNAME, contact.attributes?.LASTNAME].filter(Boolean).join(' ') || email.split('@')[0]
            await fetch(`${CRM_API}/contacts/`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${crmPit}`,
                'Content-Type': 'application/json',
                'Version': CRM_VERSION,
              },
              body: JSON.stringify({
                email,
                name,
                locationId,
                phone: contact.attributes?.SMS || '',
                tags: ['brevo-import', 'migrated'],
              }),
            })
            imported++
          } catch {
            skipped++
          }
        }

        results.push(`CRM: ${imported} contacts imported, ${skipped} skipped`)
      }

      // 3. Fetch lists and store as metadata
      const listsRes = await fetch(`${base}/contacts/lists?limit=50&offset=0`, { headers })
      const listsData = await listsRes.json()
      const lists = listsData.lists || []
      results.push(`Found ${lists.length} lists in Brevo`)

      // 4. Fetch email templates
      const templatesRes = await fetch(`${base}/smtp/templates?limit=50&offset=0`, { headers })
      const templatesData = await templatesRes.json()
      const templates = templatesData.templates || []
      results.push(`Found ${templates.length} email templates`)

      // 5. Generate .0n migration file and store
      const migrationFile = {
        schema: '0n-migration/v1',
        source: 'brevo',
        migrated_at: new Date().toISOString(),
        user_id: user.id,
        stats: {
          contacts_found: contactsData.count || contacts.length,
          contacts_imported: contacts.length,
          lists: lists.length,
          templates: templates.length,
        },
        lists: lists.map((l: any) => ({ id: l.id, name: l.name, totalSubscribers: l.totalSubscribers })),
        templates: templates.map((t: any) => ({ id: t.id, name: t.name, subject: t.subject })),
      }

      // Store migration record
      await admin.from('kb_content_queue').upsert({
        user_id: user.id,
        layer: 'K7',
        content: {
          migration: migrationFile,
          source_platform: 'brevo',
          migrated_at: new Date().toISOString(),
        },
        status: 'active',
      }, { onConflict: 'user_id,layer' })
      results.push('Migration record saved to K7')

      // 6. Update profile
      await admin.from('profiles').update({
        onboarding_complete: true,
      }).eq('id', user.id)
      results.push('Profile updated — onboarding complete')
    }

    return NextResponse.json({ success: true, platform, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed', results }, { status: 502 })
  }
}
