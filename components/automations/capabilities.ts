export interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  steps: string[]; // What this capability does behind the scenes
  configFields?: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'toggle';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  default?: string;
}

export interface CapabilityCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CapabilityCategory[] = [
  { id: 'leads', name: 'Lead Intelligence', icon: 'BarChart3', color: '#f97316' },
  { id: 'communicate', name: 'Communication', icon: 'Mail', color: '#3b82f6' },
  { id: 'schedule', name: 'Scheduling', icon: 'Calendar', color: '#8b5cf6' },
  { id: 'revenue', name: 'Revenue', icon: 'DollarSign', color: '#10b981' },
  { id: 'ai', name: 'AI Actions', icon: 'Bot', color: '#2dd4bf' },
  { id: 'social', name: 'Social Media', icon: 'Smartphone', color: '#ec4899' },
  { id: 'reports', name: 'Reports', icon: 'TrendingUp', color: '#eab308' },
  { id: 'learn', name: 'Learn', icon: 'GraduationCap', color: '#06b6d4' },
  { id: 'triggers', name: 'Triggers', icon: 'Zap', color: '#ef4444' },
];

export const CAPABILITIES: Capability[] = [
  // ── Triggers ──
  {
    id: 'trigger_new_lead',
    name: 'New Lead Comes In',
    description: 'Starts when a new contact is created from any source',
    category: 'triggers',
    icon: 'Zap',
    color: '#ef4444',
    steps: ['Watch for new contact creation', 'Capture source + UTM data', 'Pass to next step'],
  },
  {
    id: 'trigger_form_submit',
    name: 'Form Submitted',
    description: 'Starts when someone submits a form on your website',
    category: 'triggers',
    icon: 'FileText',
    color: '#ef4444',
    steps: ['Watch for form submission', 'Parse form fields', 'Create or update contact'],
  },
  {
    id: 'trigger_appointment_booked',
    name: 'Appointment Booked',
    description: 'Starts when a client books an appointment',
    category: 'triggers',
    icon: 'Calendar',
    color: '#ef4444',
    steps: ['Watch for booking event', 'Extract appointment details', 'Pass contact + time'],
  },
  {
    id: 'trigger_payment_received',
    name: 'Payment Received',
    description: 'Starts when a payment comes through Stripe',
    category: 'triggers',
    icon: 'CreditCard',
    color: '#ef4444',
    steps: ['Watch Stripe webhook', 'Match to contact', 'Record payment amount'],
  },
  {
    id: 'trigger_tag_added',
    name: 'Tag Added',
    description: 'Starts when a specific tag is applied to a contact',
    category: 'triggers',
    icon: 'Tag',
    color: '#ef4444',
    steps: ['Watch for tag event', 'Identify contact', 'Pass to next step'],
    configFields: [
      { key: 'tag', label: 'Which tag?', type: 'text', placeholder: 'e.g. hot-lead', required: true },
    ],
  },
  {
    id: 'trigger_no_response',
    name: 'No Response (X Days)',
    description: 'Starts when a lead hasn\'t replied in X days',
    category: 'triggers',
    icon: 'Clock',
    color: '#ef4444',
    steps: ['Check last response date', 'Compare to threshold', 'Trigger if exceeded'],
    configFields: [
      { key: 'days', label: 'Days without response', type: 'number', placeholder: '3', default: '3' },
    ],
  },

  // ── Lead Intelligence ──
  {
    id: 'score_hot_leads',
    name: 'Score Hot Leads',
    description: 'AI scores all leads and identifies the hottest prospects',
    category: 'leads',
    icon: 'Flame',
    color: '#f97316',
    steps: ['Pull all active leads', 'Analyze engagement signals', 'Score 1-100', 'Tag hot leads', 'Notify you'],
  },
  {
    id: 'get_fb_lead_cost',
    name: 'Get Facebook Lead Cost',
    description: 'Calculate cost per lead from your Facebook ad campaigns',
    category: 'leads',
    icon: 'Banknote',
    color: '#f97316',
    steps: ['Pull Facebook Ads data', 'Count new leads from FB', 'Calculate cost per lead', 'Generate report'],
  },
  {
    id: 'identify_stale_leads',
    name: 'Identify Stale Leads',
    description: 'Find leads that haven\'t been contacted in 7+ days',
    category: 'leads',
    icon: 'Snowflake',
    color: '#f97316',
    steps: ['Query all open leads', 'Check last activity date', 'Flag stale leads', 'Create follow-up tasks'],
  },
  {
    id: 'enrich_contact',
    name: 'Enrich Contact Data',
    description: 'Auto-fill missing contact info from public data',
    category: 'leads',
    icon: 'Search',
    color: '#f97316',
    steps: ['Check for missing fields', 'Search public databases', 'Fill company/title/social', 'Update contact'],
  },
  {
    id: 'qualify_lead',
    name: 'Qualify Lead',
    description: 'Run qualification criteria and move to right pipeline stage',
    category: 'leads',
    icon: 'CheckCircle',
    color: '#f97316',
    steps: ['Check qualification rules', 'Score against criteria', 'Move pipeline stage', 'Assign to rep'],
    configFields: [
      { key: 'pipeline', label: 'Pipeline', type: 'text', placeholder: 'Sales Pipeline' },
    ],
  },

  // ── Communication ──
  {
    id: 'start_email_campaign',
    name: 'Start Email Campaign',
    description: 'Enroll contacts into an automated email sequence',
    category: 'communicate',
    icon: 'Mail',
    color: '#3b82f6',
    steps: ['Select target contacts', 'Load email template', 'Schedule send sequence', 'Track opens/clicks'],
    configFields: [
      { key: 'template', label: 'Campaign template', type: 'text', placeholder: 'Welcome Series' },
      { key: 'delay', label: 'Delay between emails', type: 'select', options: ['1 day', '2 days', '3 days', '5 days', '7 days'], default: '2 days' },
    ],
  },
  {
    id: 'send_sms',
    name: 'Send SMS',
    description: 'Send a text message to the contact',
    category: 'communicate',
    icon: 'MessageSquare',
    color: '#3b82f6',
    steps: ['Load contact phone', 'Send SMS via Twilio', 'Log in conversation'],
    configFields: [
      { key: 'message', label: 'Message', type: 'text', placeholder: 'Hi {{first_name}}, ...' },
    ],
  },
  {
    id: 'send_website_report',
    name: 'Send Website Report',
    description: 'Generate and email a website performance report',
    category: 'communicate',
    icon: 'BarChart3',
    color: '#3b82f6',
    steps: ['Scan website metrics', 'Generate PDF report', 'Email to contact', 'Log activity'],
  },
  {
    id: 'follow_up_no_show',
    name: 'Follow Up After No-Show',
    description: 'Automatically reach out when someone misses their appointment',
    category: 'communicate',
    icon: 'RefreshCw',
    color: '#3b82f6',
    steps: ['Detect missed appointment', 'Wait 1 hour', 'Send "we missed you" email', 'Offer reschedule link'],
  },
  {
    id: 'send_review_request',
    name: 'Request a Review',
    description: 'Ask happy clients to leave a Google review',
    category: 'communicate',
    icon: 'Star',
    color: '#3b82f6',
    steps: ['Check if service completed', 'Wait 24 hours', 'Send review request', 'Track if reviewed'],
  },

  // ── Scheduling ──
  {
    id: 'book_appointment',
    name: 'Book Appointment',
    description: 'Create a booking on the calendar for a contact',
    category: 'schedule',
    icon: 'Calendar',
    color: '#8b5cf6',
    steps: ['Check calendar availability', 'Create booking', 'Send confirmation', 'Add to CRM'],
    configFields: [
      { key: 'calendar', label: 'Calendar', type: 'text', placeholder: 'Main Calendar' },
      { key: 'duration', label: 'Duration', type: 'select', options: ['15 min', '30 min', '45 min', '60 min', '90 min'], default: '30 min' },
    ],
  },
  {
    id: 'send_reminder',
    name: 'Send Reminder Sequence',
    description: '3-step reminder: 24hr, 1hr, and 15min before appointment',
    category: 'schedule',
    icon: 'Bell',
    color: '#8b5cf6',
    steps: ['Schedule 24hr reminder email', 'Schedule 1hr SMS reminder', 'Schedule 15min final reminder'],
  },
  {
    id: 'reschedule_no_shows',
    name: 'Reschedule No-Shows',
    description: 'Automatically offer new times to people who missed appointments',
    category: 'schedule',
    icon: 'Repeat',
    color: '#8b5cf6',
    steps: ['Detect no-show', 'Send reschedule link', 'Offer next 3 available slots', 'Update calendar on confirm'],
  },

  // ── Revenue ──
  {
    id: 'create_invoice',
    name: 'Create & Send Invoice',
    description: 'Generate and email an invoice to the contact',
    category: 'revenue',
    icon: 'Receipt',
    color: '#10b981',
    steps: ['Create invoice in CRM', 'Add line items', 'Email to contact', 'Track payment status'],
    configFields: [
      { key: 'amount', label: 'Amount ($)', type: 'number', placeholder: '0.00' },
      { key: 'description', label: 'Description', type: 'text', placeholder: 'Service description' },
    ],
  },
  {
    id: 'track_payment',
    name: 'Track Payment Status',
    description: 'Check if an invoice has been paid and follow up if not',
    category: 'revenue',
    icon: 'CreditCard',
    color: '#10b981',
    steps: ['Check invoice status', 'If unpaid > 3 days: send reminder', 'If unpaid > 7 days: escalate', 'If paid: tag as customer'],
  },
  {
    id: 'upsell_alert',
    name: 'Upsell Opportunity',
    description: 'Identify contacts ready for an upsell and notify your team',
    category: 'revenue',
    icon: 'TrendingUp',
    color: '#10b981',
    steps: ['Analyze purchase history', 'Identify upsell candidates', 'Create opportunity', 'Notify sales rep'],
  },

  // ── AI Actions ──
  {
    id: 'ai_generate_content',
    name: 'Generate Content',
    description: 'AI writes an email, social post, or blog draft',
    category: 'ai',
    icon: 'PenLine',
    color: '#2dd4bf',
    steps: ['Determine content type', 'Generate with AI', 'Queue for review or auto-send'],
    configFields: [
      { key: 'type', label: 'Content type', type: 'select', options: ['Email', 'SMS', 'Social Post', 'Blog Draft'], default: 'Email' },
      { key: 'topic', label: 'Topic / prompt', type: 'text', placeholder: 'Write about...' },
    ],
  },
  {
    id: 'ai_ask_council',
    name: 'Ask the AI Council',
    description: 'Get answers from 5 AI models simultaneously',
    category: 'ai',
    icon: 'Brain',
    color: '#2dd4bf',
    steps: ['Send question to GPT, Gemini, Grok, Claude, Llama', 'Cross-critique', 'Synthesize best answer', 'Return result'],
  },
  {
    id: 'ai_classify_intent',
    name: 'Classify Lead Intent',
    description: 'AI reads the conversation and determines what the lead wants',
    category: 'ai',
    icon: 'Target',
    color: '#2dd4bf',
    steps: ['Pull recent messages', 'AI analyzes intent', 'Tag contact with intent', 'Route to right workflow'],
  },

  // ── Social Media ──
  {
    id: 'post_social',
    name: 'Post to Social Media',
    description: 'Publish content to Facebook, Instagram, or LinkedIn',
    category: 'social',
    icon: 'Smartphone',
    color: '#ec4899',
    steps: ['Format content per platform', 'Schedule or post immediately', 'Track engagement'],
    configFields: [
      { key: 'platforms', label: 'Platforms', type: 'select', options: ['Facebook', 'Instagram', 'LinkedIn', 'All'], default: 'All' },
    ],
  },
  {
    id: 'monitor_mentions',
    name: 'Monitor Brand Mentions',
    description: 'Get alerted when someone mentions your brand online',
    category: 'social',
    icon: 'Eye',
    color: '#ec4899',
    steps: ['Scan social platforms', 'Match brand keywords', 'Alert via Slack or email', 'Log mention'],
  },

  // ── Reports ──
  {
    id: 'daily_summary',
    name: 'Daily Business Summary',
    description: 'Get a morning report of leads, appointments, and revenue',
    category: 'reports',
    icon: 'Sun',
    color: '#eab308',
    steps: ['Pull today\'s appointments', 'Count new leads', 'Sum revenue', 'Email digest'],
  },
  {
    id: 'weekly_pipeline',
    name: 'Weekly Pipeline Report',
    description: 'Summary of all deals, stages, and projected revenue',
    category: 'reports',
    icon: 'BarChart3',
    color: '#eab308',
    steps: ['Query all pipeline stages', 'Calculate projections', 'Compare to last week', 'Email report'],
  },

  // ── Learn ──
  {
    id: 'learn_custom',
    name: 'Learn Something',
    description: 'Describe what you want to learn — AI generates a contextual micro-lesson',
    category: 'learn',
    icon: 'GraduationCap',
    color: '#06b6d4',
    steps: ['Analyze workflow context', 'Generate lesson content', 'Deliver to user'],
    configFields: [
      { key: 'topic', label: 'What do you want to learn?', type: 'text', placeholder: 'e.g. How does lead scoring work?', required: true },
      { key: 'depth', label: 'Depth', type: 'select', options: ['Quick overview', 'Detailed breakdown', 'Expert deep-dive'], default: 'Detailed breakdown' },
      { key: 'delivery', label: 'How to deliver', type: 'select', options: ['In-app notification', 'Email', 'Dashboard card'], default: 'In-app notification' },
    ],
  },
  {
    id: 'learn_why',
    name: 'Explain Why This Happened',
    description: 'After any step, adds an AI explanation of what happened and why',
    category: 'learn',
    icon: 'HelpCircle',
    color: '#06b6d4',
    steps: ['Read previous step output', 'AI explains the result', 'Deliver explanation'],
    configFields: [
      { key: 'delivery', label: 'How to deliver', type: 'select', options: ['In-app notification', 'Email', 'Dashboard card'], default: 'In-app notification' },
    ],
  },
  {
    id: 'learn_improve',
    name: 'Suggest Improvements',
    description: 'AI analyzes the workflow results and suggests optimizations',
    category: 'learn',
    icon: 'Lightbulb',
    color: '#06b6d4',
    steps: ['Analyze all step outputs', 'Identify bottlenecks', 'Generate improvement suggestions'],
    configFields: [
      { key: 'focus', label: 'Focus area', type: 'select', options: ['Speed', 'Conversion rate', 'Cost efficiency', 'Customer experience', 'All areas'], default: 'All areas' },
    ],
  },
  {
    id: 'learn_pattern',
    name: 'Spot Patterns',
    description: 'Over time, AI identifies recurring patterns in your automation data',
    category: 'learn',
    icon: 'Scan',
    color: '#06b6d4',
    steps: ['Pull execution history', 'Analyze trends', 'Report patterns', 'Suggest actions'],
  },
  {
    id: 'learn_course',
    name: 'Build Mini Course',
    description: 'AI creates a 3-5 lesson micro-course based on what your automation does',
    category: 'learn',
    icon: 'BookOpen',
    color: '#06b6d4',
    steps: ['Analyze workflow structure', 'Generate lesson plan', 'Create lessons', 'Save to Knowledge Base'],
    configFields: [
      { key: 'audience', label: 'Who is this for?', type: 'select', options: ['Myself', 'My team', 'My clients'], default: 'Myself' },
      { key: 'format', label: 'Format', type: 'select', options: ['Text lessons', 'Step-by-step guide', 'FAQ format', 'Video script'], default: 'Text lessons' },
    ],
  },
];

export function getCapability(id: string): Capability | undefined {
  return CAPABILITIES.find(c => c.id === id);
}

export function getCapabilitiesByCategory(categoryId: string): Capability[] {
  return CAPABILITIES.filter(c => c.category === categoryId);
}
