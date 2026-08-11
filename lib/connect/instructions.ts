/**
 * How to find a sub-account ID, and how to generate a key for it.
 *
 * Written once, here, because these steps appear in the setup screen, the
 * sign-in alert and support replies — and three copies of an instruction
 * eventually disagree about which menu something is under.
 *
 * Never say "GHL" — always "CRM".
 */

export interface HowTo {
  title: string
  /** Why they are being asked, in one line. Skipping this makes it feel arbitrary. */
  why: string
  steps: string[]
  /** The thing people get wrong. Worth its own line. */
  gotcha?: string
}

/** The scopes a key needs for 0nCORE to do what the Actions list promises. */
export const REQUIRED_SCOPES = [
  'contacts.readonly',
  'contacts.write',
  'conversations.readonly',
  'conversations.write',
  'conversations/message.readonly',
  'conversations/message.write',
  'opportunities.readonly',
  'opportunities.write',
  'calendars.readonly',
  'calendars/events.write',
  'workflows.readonly',
  'users.readonly',
  'locations.readonly',
  'products.write',
  'courses.write',
] as const

export const FIND_LOCATION_ID: HowTo = {
  title: 'Find the account ID',
  why: 'This is how 0nCORE tells your client accounts apart — several can share the same name.',
  steps: [
    'In your CRM, switch into the sub-account you want to use.',
    'Look at the browser address bar. The URL contains /location/ followed by a long code — for example .../location/nphConTwfHcVE1oA0uep/dashboard.',
    'That code after /location/ is the account ID. Copy it.',
    'Alternative: inside that sub-account go to Settings → Business Profile, where the same ID is listed.',
  ],
  gotcha:
    'Take the ID from inside the SUB-ACCOUNT, not from your agency view. The agency ID looks similar and will not work.',
}

export const GENERATE_PIT: HowTo = {
  title: 'Generate the account key',
  why: 'Your agency token can list your clients but cannot do anything inside one. Each account needs its own key before 0nCORE can act in it.',
  steps: [
    'In your CRM, switch into that same sub-account.',
    'Go to Settings → Private Integrations.',
    'Click Create new integration (some plans call it "New Private Integration").',
    'Name it 0nCORE so you recognise it later.',
    'Tick the scopes listed below — these are what the actions need. If a scope is missing from your plan, tick the closest match and carry on.',
    'Click Create, then copy the key. It starts with pit- and is only shown once.',
    'Paste it back here.',
  ],
  gotcha:
    'The key is displayed a single time. If you navigate away before copying it, delete the integration and create a new one.',
}

/** Both steps in the order they must happen. */
export const CONNECT_HOWTO: HowTo[] = [FIND_LOCATION_ID, GENERATE_PIT]
