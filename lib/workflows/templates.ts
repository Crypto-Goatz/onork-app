/**
 * Agent Bridge — Pre-built workflow templates
 *
 * These templates are deployed by the bridge when a user requests
 * a common automation via natural language.
 */

export interface WorkflowStep {
  delay: string
  type: 'sms' | 'email' | 'task' | 'webhook' | 'tag' | 'internal_note'
  template?: string
  subject?: string
  title?: string
  tag?: string
  note?: string
  webhookUrl?: string
}

export interface WorkflowTemplate {
  name: string
  description: string
  trigger: string
  steps: WorkflowStep[]
  tags?: string[]
}

export const TEMPLATES: Record<string, WorkflowTemplate> = {
  'lead-followup': {
    name: 'Lead Follow-up Sequence',
    description: 'Text in 5 min, email in 1 hour, call task in 24 hours',
    trigger: 'contact.created',
    tags: ['new-lead', 'follow-up'],
    steps: [
      {
        delay: '5m',
        type: 'sms',
        template:
          'Hi {{contact.name}}, thanks for reaching out to {{business.name}}! We received your inquiry and will follow up shortly. Reply STOP to opt out.',
      },
      {
        delay: '1h',
        type: 'email',
        subject: 'Thanks for contacting {{business.name}}',
        template:
          'Hi {{contact.name}},\n\nThank you for your interest in {{business.name}}. We wanted to make sure you received a personal follow-up.\n\nIs there anything specific we can help you with? Feel free to reply to this email or call us directly.\n\nBest regards,\n{{business.name}} Team',
      },
      {
        delay: '24h',
        type: 'task',
        title: 'Call {{contact.name}} — new lead follow-up',
      },
    ],
  },

  'appointment-reminder': {
    name: 'Appointment Reminder',
    description: 'Email 24h before, text 1h before appointment',
    trigger: 'appointment.scheduled',
    tags: ['appointment', 'reminder'],
    steps: [
      {
        delay: '-24h',
        type: 'email',
        subject: 'Reminder: Your appointment tomorrow',
        template:
          'Hi {{contact.name}},\n\nThis is a friendly reminder about your appointment tomorrow with {{business.name}}.\n\nDate: {{appointment.date}}\nTime: {{appointment.time}}\n\nIf you need to reschedule, please let us know as soon as possible.\n\nSee you soon!',
      },
      {
        delay: '-1h',
        type: 'sms',
        template:
          'Quick reminder: Your appointment with {{business.name}} is in 1 hour. See you soon!',
      },
    ],
  },

  'review-request': {
    name: 'Review Request',
    description: 'Text after 2h, email at 24h asking for a review',
    trigger: 'appointment.completed',
    tags: ['review', 'reputation'],
    steps: [
      {
        delay: '2h',
        type: 'sms',
        template:
          'Thanks for visiting {{business.name}}, {{contact.name}}! We hope you had a great experience. Would you mind leaving us a quick review? {{review.link}}',
      },
      {
        delay: '24h',
        type: 'email',
        subject: 'How was your experience with {{business.name}}?',
        template:
          'Hi {{contact.name}},\n\nWe hope you enjoyed your recent visit to {{business.name}}. Your feedback means the world to us.\n\nWould you take a moment to share your experience?\n\n{{review.link}}\n\nThank you!\n{{business.name}} Team',
      },
    ],
  },

  'winback': {
    name: 'Win-back Campaign',
    description: 'Re-engage inactive contacts over 60 days',
    trigger: 'contact.inactive',
    tags: ['winback', 'reactivation'],
    steps: [
      {
        delay: '30d',
        type: 'email',
        subject: 'We miss you, {{contact.name}}!',
        template:
          "Hi {{contact.name}},\n\nIt's been a while since we've seen you at {{business.name}}. We'd love to welcome you back!\n\nWe've got some exciting updates and would love to share them with you.\n\nBest,\n{{business.name}} Team",
      },
      {
        delay: '45d',
        type: 'sms',
        template:
          "Hey {{contact.name}}, we have a special offer just for you at {{business.name}}! Reply YES to learn more or visit us soon. We'd love to see you again.",
      },
      {
        delay: '60d',
        type: 'email',
        subject: 'Last chance — special offer inside',
        template:
          "Hi {{contact.name}},\n\nWe haven't heard from you in a while and wanted to reach out one more time.\n\nWe have something special reserved for returning clients. Don't miss out!\n\nHope to see you soon,\n{{business.name}} Team",
      },
    ],
  },

  'onboarding': {
    name: 'Client Onboarding',
    description: 'Welcome email, getting started guide, pro tips, check-in call',
    trigger: 'contact.created',
    tags: ['onboarding', 'new-client'],
    steps: [
      {
        delay: '0',
        type: 'email',
        subject: 'Welcome to {{business.name}}!',
        template:
          'Hi {{contact.name}},\n\nWelcome aboard! We\'re thrilled to have you as part of the {{business.name}} family.\n\nHere\'s what you can expect next:\n1. A getting-started guide (coming tomorrow)\n2. Pro tips to get the most out of our services\n3. A personal check-in call from our team\n\nIf you have any questions, don\'t hesitate to reach out.\n\nCheers,\n{{business.name}} Team',
      },
      {
        delay: '1d',
        type: 'email',
        subject: 'Getting started with {{business.name}}',
        template:
          'Hi {{contact.name}},\n\nHere are a few things to help you get started:\n\n- Log in to your account and explore the dashboard\n- Set your preferences and notification settings\n- Check out our knowledge base for FAQs\n\nNeed help? Just reply to this email.\n\nBest,\n{{business.name}} Team',
      },
      {
        delay: '3d',
        type: 'email',
        subject: 'Pro tips from {{business.name}}',
        template:
          'Hi {{contact.name}},\n\nNow that you\'ve had a few days to settle in, here are some pro tips:\n\n- Tip 1: Customize your dashboard for quick access\n- Tip 2: Set up notifications so you never miss an update\n- Tip 3: Explore our integrations for even more power\n\nHappy exploring!\n{{business.name}} Team',
      },
      {
        delay: '7d',
        type: 'task',
        title: 'Check-in call with {{contact.name}} — onboarding week 1',
      },
    ],
  },

  'missed-call': {
    name: 'Missed Call Text-back',
    description: 'Instant text when a call is missed',
    trigger: 'call.missed',
    tags: ['missed-call', 'text-back'],
    steps: [
      {
        delay: '0',
        type: 'sms',
        template:
          "Hi! Sorry we missed your call to {{business.name}}. How can we help you? We'll get back to you ASAP.",
      },
      {
        delay: '30m',
        type: 'task',
        title: 'Return missed call from {{contact.name}}',
      },
    ],
  },

  'invoice-followup': {
    name: 'Invoice Follow-up',
    description: 'Reminder emails for unpaid invoices',
    trigger: 'invoice.sent',
    tags: ['invoice', 'payment'],
    steps: [
      {
        delay: '3d',
        type: 'email',
        subject: 'Friendly reminder: Invoice from {{business.name}}',
        template:
          'Hi {{contact.name}},\n\nJust a friendly reminder that your invoice from {{business.name}} is still outstanding.\n\nIf you\'ve already sent payment, please disregard this message.\n\nThank you,\n{{business.name}} Team',
      },
      {
        delay: '7d',
        type: 'sms',
        template:
          'Hi {{contact.name}}, this is a reminder about your pending invoice from {{business.name}}. Please let us know if you have any questions.',
      },
      {
        delay: '14d',
        type: 'email',
        subject: 'Action needed: Outstanding invoice',
        template:
          'Hi {{contact.name}},\n\nWe noticed your invoice is still unpaid. Please take a moment to review and process your payment at your earliest convenience.\n\nIf you need to discuss anything, we\'re here to help.\n\nBest,\n{{business.name}} Team',
      },
    ],
  },
}

export function getTemplateByKey(key: string): WorkflowTemplate | null {
  return TEMPLATES[key] ?? null
}

export function matchTemplate(intent: string): string | null {
  const lower = intent.toLowerCase()
  const matchers: [string, string[]][] = [
    ['lead-followup', ['lead', 'follow-up', 'followup', 'follow up', 'new lead']],
    ['appointment-reminder', ['appointment', 'reminder', 'remind']],
    ['review-request', ['review', 'reputation', 'feedback']],
    ['winback', ['win-back', 'winback', 'win back', 'inactive', 're-engage', 'reengage']],
    ['onboarding', ['onboard', 'welcome', 'new client', 'new customer']],
    ['missed-call', ['missed call', 'text-back', 'textback', 'text back']],
    ['invoice-followup', ['invoice', 'payment reminder', 'unpaid']],
  ]
  for (const [key, keywords] of matchers) {
    if (keywords.some((kw) => lower.includes(kw))) return key
  }
  return null
}
