import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/crm/connect — Generate CRM OAuth install URL
// This lets users install the marketplace app FROM the 0nCore dashboard
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.CRM_MARKETPLACE_APP_CLIENT_ID || '69c762225a31e1cd2f28dd4c-mnu5pazi'
  const redirectUri = encodeURIComponent('https://0ncore.com/api/oauth/callback')

  // All scopes the app needs
  const scopes = [
    'contacts.readonly', 'contacts.write',
    'conversations.readonly', 'conversations.write', 'conversations/message.readonly', 'conversations/message.write',
    'calendars.readonly', 'calendars.write', 'calendars/events.readonly', 'calendars/events.write',
    'opportunities.readonly', 'opportunities.write',
    'invoices.readonly', 'invoices.write',
    'payments/orders.readonly', 'payments/orders.write', 'payments/transactions.readonly',
    'socialplanner/oauth.readonly', 'socialplanner/oauth.write',
    'socialplanner/post.readonly', 'socialplanner/post.write',
    'socialplanner/account.readonly', 'socialplanner/account.write',
    'socialplanner/csv.readonly', 'socialplanner/csv.write',
    'socialplanner/category.readonly', 'socialplanner/category.write',
    'emails/builder.readonly', 'emails/builder.write',
    'forms.readonly', 'forms.write',
    'funnels/funnel.readonly', 'funnels/page.readonly', 'funnels/redirect.readonly', 'funnels/redirect.write',
    'locations.readonly', 'locations/customFields.readonly', 'locations/customFields.write',
    'locations/customValues.readonly', 'locations/customValues.write',
    'locations/tasks.readonly', 'locations/tasks.write',
    'locations/tags.readonly', 'locations/tags.write',
    'medias.readonly', 'medias.write',
    'users.readonly', 'users.write',
    'products.readonly', 'products.write',
    'campaigns.readonly',
    'workflows.readonly',
    'phonenumbers.read', 'phonenumbers.write',
    'objects/schema.readonly', 'objects/schema.write', 'objects/record.readonly', 'objects/record.write',
    'knowledge-bases.readonly', 'knowledge-bases.write',
    'blogs/posts.readonly', 'blogs/post.write', 'blogs/list.readonly',
    'brand-boards/design-kit.readonly', 'brand-boards/design-kit.write',
    'voice-ai-agents.readonly', 'voice-ai-agents.write',
    'courses.readonly', 'courses.write',
    'surveys.readonly',
    'businesses.readonly', 'businesses.write',
    'oauth.readonly', 'oauth.write',
    'saas/location.read', 'saas/location.write',
  ].join('+')

  const installUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${redirectUri}&client_id=${clientId}&scope=${scopes}`

  return NextResponse.json({ url: installUrl })
}
