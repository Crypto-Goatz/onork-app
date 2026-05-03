/**
 * VIP client registry.
 *
 * Spa Ligonier is the first VIP client. This is hardcoded for now — when
 * we onboard a second VIP, promote this to a `vip_clients` Supabase table
 * with the same shape.
 *
 * Each entry drives:
 *   • brand tokens for the dashboard hero
 *   • the data sources we pull from (CRM location, D&R site id, etc)
 *   • access control — only emails in `authorized_emails` (or admins) can
 *     view the page
 */

export interface VipClient {
  slug: string
  name: string
  shortName: string
  /** Public website */
  website?: string
  /** Marketing tagline shown under the hero name */
  tagline?: string
  /** Logo URL — full lockup, ~120×40 */
  logoUrl?: string
  /** Square / monogram fallback if the lockup isn't loaded */
  monogram?: string
  /** Brand palette */
  brand: {
    primary: string
    primaryDark: string
    accent: string
    accentLight: string
    bg: string
    bgSoft: string
    bgCard: string
    text: string
    textSecondary: string
    textMuted: string
    border: string
  }
  /** Display fonts */
  fonts?: {
    display?: string
    body?: string
  }
  /** Address strip on the hero */
  address?: string
  phone?: string
  email?: string
  /** Data source keys */
  sources: {
    crmLocationId: string
    crmPitEnv?: string // env var holding the spa's PIT
    drSiteId?: string
    ga4PropertyId?: string
    googleAdsCustomerId?: string
    massageBookBusinessId?: string
    stripeAccountId?: string
  }
  /** Currently active campaigns to surface on the dashboard */
  activeCampaigns?: VipCampaign[]
  /** Anyone in this list can view /vip/{slug} (case-insensitive). Admins always. */
  authorizedEmails: string[]
}

export interface VipCampaign {
  id: string
  name: string
  startDate: string
  endDate: string
  /** Tag in CRM that gates "enrolled" contacts */
  enrollTag: string
  /** Tag that signals a confirmed sale */
  purchaseTag: string
  /** Funnel stage tags in order */
  funnelTags: string[]
  /** Click-through tag(s) */
  clickTag: string
  /** External deal URL the campaign drives traffic to */
  dealUrl: string
}

export const VIP_CLIENTS: Record<string, VipClient> = {
  spa: {
    slug: 'spa',
    name: 'The Spa In Ligonier',
    shortName: 'Spa Ligonier',
    website: 'https://spaligonier.com',
    tagline: 'A quiet hour where someone else takes care of you.',
    logoUrl: 'https://spaligonier.com/wp-content/uploads/spa-ligonier-logo.png',
    monogram: 'SL',
    brand: {
      primary: '#2c4b43',
      primaryDark: '#1a2c27',
      accent: '#c56a57',
      accentLight: '#e09080',
      bg: '#f7f2ea',
      bgSoft: '#efe6da',
      bgCard: '#ffffff',
      text: '#1a2c27',
      textSecondary: '#2c4b43',
      textMuted: '#5b6e63',
      border: '#e6dccf',
    },
    fonts: {
      display: 'Georgia, "Times New Roman", serif',
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    address: '201 S Fairfield St · Ligonier, PA 15658',
    phone: '+1-724-238-9800',
    email: 'spaligonier@gmail.com',
    sources: {
      crmLocationId: 'F76MNKOMQCMruMrumtdf',
      crmPitEnv: 'CRM_PIT_SPA_LIGONIER', // value: pit-3b3a956e-2586-4048-ada8-f92caf34240c
      drSiteId: 'spa-ligonier', // not yet provisioned
      ga4PropertyId: '', // TODO
      googleAdsCustomerId: '', // TODO
      massageBookBusinessId: '1554118',
      stripeAccountId: '', // spa charges flow through MassageBook, not Stripe directly
    },
    activeCampaigns: [
      {
        id: 'mothers-day-2026',
        name: "Mother's Day 2026",
        startDate: '2026-05-03',
        endDate: '2026-05-12',
        enrollTag: 'mothers-day-2026',
        purchaseTag: 'md-purchased',
        clickTag: 'md-clicked-giftcard',
        funnelTags: ['mothers-day-2026', 'md-clicked-giftcard', 'md-purchased'],
        dealUrl:
          'https://www.massagebook.com/ligonier/massage/promotion/preview/Mothers-Day-2026/200926',
      },
    ],
    authorizedEmails: [
      'rachelgmento@gmail.com',
      'spaligonier@gmail.com',
      'mike@rocketopp.com',
    ],
  },
}

export function getVipClient(slug: string): VipClient | null {
  return VIP_CLIENTS[slug.toLowerCase()] || null
}
