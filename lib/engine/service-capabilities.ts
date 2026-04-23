/**
 * Service Capabilities Map — deep knowledge of what each connected service can do.
 * Used by the AI engine to generate automations that are actually executable.
 * Each service lists its data types, actions, and triggers.
 */

export interface ServiceCapability {
  name: string
  logo: string
  category: string
  dataTypes: string[]
  actions: string[]
  triggers: string[]
  fields: Record<string, string[]>  // data type → available fields
}

export const SERVICE_CAPABILITIES: Record<string, ServiceCapability> = {
  crm: {
    name: 'CRM',
    logo: 'crm',
    category: 'CRM',
    dataTypes: ['contacts', 'opportunities', 'pipelines', 'calendars', 'invoices', 'conversations', 'tasks', 'users', 'products', 'forms', 'surveys'],
    actions: [
      'Create contact', 'Update contact', 'Delete contact', 'Search contacts',
      'Add tag', 'Remove tag', 'Move pipeline stage',
      'Create opportunity', 'Update opportunity',
      'Book appointment', 'Create task', 'Assign task',
      'Send email', 'Send SMS', 'Create invoice',
      'Create note', 'Add to workflow',
    ],
    triggers: [
      'New contact created', 'Contact updated', 'Tag added', 'Tag removed',
      'Form submitted', 'Appointment booked', 'Appointment cancelled',
      'Pipeline stage changed', 'Payment received', 'Invoice paid',
      'Task completed', 'Conversation started', 'Reply received',
    ],
    fields: {
      contacts: ['email', 'phone', 'firstName', 'lastName', 'name', 'company', 'address', 'city', 'state', 'zip', 'country', 'tags', 'source', 'customFields'],
      opportunities: ['name', 'value', 'stage', 'pipeline', 'contact', 'status', 'closeDate'],
      calendars: ['title', 'startTime', 'endTime', 'calendar', 'contact', 'location'],
    },
  },

  stripe: {
    name: 'Stripe',
    logo: 'stripe',
    category: 'Payments',
    dataTypes: ['customers', 'subscriptions', 'invoices', 'payments', 'products', 'prices', 'checkout_sessions'],
    actions: [
      'Create customer', 'Update customer', 'Create subscription',
      'Cancel subscription', 'Create invoice', 'Send invoice',
      'Create product', 'Create price', 'Create checkout session',
      'Issue refund', 'Get balance',
    ],
    triggers: [
      'Payment succeeded', 'Payment failed', 'Subscription created',
      'Subscription cancelled', 'Invoice paid', 'Invoice overdue',
      'Checkout completed', 'Customer created',
    ],
    fields: {
      customers: ['email', 'name', 'phone', 'metadata'],
      subscriptions: ['plan', 'status', 'interval', 'amount'],
      invoices: ['amount', 'status', 'dueDate', 'items'],
    },
  },

  brevo: {
    name: 'Brevo',
    logo: 'brevo',
    category: 'Email',
    dataTypes: ['contacts', 'lists', 'campaigns', 'templates', 'transactional_emails', 'sms'],
    actions: [
      'Create contact', 'Update contact', 'Add to list', 'Remove from list',
      'Send transactional email', 'Send SMS', 'Send WhatsApp',
      'Create campaign', 'Schedule campaign', 'Get campaign stats',
    ],
    triggers: [
      'Email opened', 'Email clicked', 'Email bounced', 'Unsubscribed',
      'Contact created', 'Contact updated', 'SMS delivered',
    ],
    fields: {
      contacts: ['email', 'firstName', 'lastName', 'sms', 'attributes', 'listIds'],
      campaigns: ['name', 'subject', 'sender', 'htmlContent', 'recipients'],
    },
  },

  slack: {
    name: 'Slack',
    logo: 'slack',
    category: 'Communication',
    dataTypes: ['channels', 'messages', 'users', 'files'],
    actions: [
      'Send message', 'Create channel', 'List channels',
      'Upload file', 'Add reaction', 'Set topic',
    ],
    triggers: [
      'Message received', 'Mention received', 'File shared',
      'Channel created', 'Member joined',
    ],
    fields: {
      messages: ['channel', 'text', 'blocks', 'attachments', 'thread_ts'],
    },
  },

  supabase: {
    name: 'Supabase',
    logo: 'supabase',
    category: 'Database',
    dataTypes: ['tables', 'rows', 'functions', 'storage', 'auth_users'],
    actions: [
      'Query table', 'Insert row', 'Update row', 'Delete row',
      'Call function', 'Upload file', 'Create user',
    ],
    triggers: [
      'Row inserted', 'Row updated', 'Row deleted',
      'User signed up', 'Auth event',
    ],
    fields: {
      rows: ['table', 'columns', 'filters', 'orderBy', 'limit'],
    },
  },

  gmail: {
    name: 'Gmail',
    logo: 'gmail',
    category: 'Email',
    dataTypes: ['messages', 'threads', 'labels', 'drafts'],
    actions: [
      'Send email', 'List messages', 'Get message', 'Create draft',
      'Add label', 'Remove label', 'Mark as read',
    ],
    triggers: [
      'New email received', 'Email with label', 'Email from contact',
    ],
    fields: {
      messages: ['to', 'from', 'subject', 'body', 'cc', 'bcc', 'attachments'],
    },
  },

  hubspot: {
    name: 'HubSpot',
    logo: 'hubspot',
    category: 'CRM',
    dataTypes: ['contacts', 'companies', 'deals', 'tickets', 'engagements'],
    actions: [
      'Create contact', 'Update contact', 'Create company',
      'Create deal', 'Update deal stage', 'Create ticket',
      'Log activity', 'Add to list',
    ],
    triggers: [
      'Contact created', 'Deal stage changed', 'Form submitted',
      'Email opened', 'Meeting booked',
    ],
    fields: {
      contacts: ['email', 'firstname', 'lastname', 'phone', 'company', 'lifecycle_stage'],
      deals: ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate'],
    },
  },

  sendgrid: {
    name: 'SendGrid',
    logo: 'sendgrid',
    category: 'Email',
    dataTypes: ['contacts', 'lists', 'templates', 'campaigns', 'stats'],
    actions: [
      'Send email', 'Add contacts', 'Create list', 'Send template',
      'Get stats', 'List templates',
    ],
    triggers: [
      'Email delivered', 'Email opened', 'Email bounced', 'Link clicked',
    ],
    fields: {
      emails: ['to', 'from', 'subject', 'html', 'text', 'templateId', 'dynamicData'],
    },
  },

  github: {
    name: 'GitHub',
    logo: 'github',
    category: 'Dev Tools',
    dataTypes: ['repos', 'issues', 'pull_requests', 'commits', 'releases'],
    actions: [
      'Create issue', 'Create PR', 'List repos', 'Create release',
      'Add comment', 'Merge PR',
    ],
    triggers: [
      'Push to repo', 'PR opened', 'PR merged', 'Issue created',
      'Release published', 'Star added',
    ],
    fields: {
      issues: ['title', 'body', 'labels', 'assignees', 'milestone'],
    },
  },

  shopify: {
    name: 'Shopify',
    logo: 'shopify',
    category: 'E-Commerce',
    dataTypes: ['orders', 'products', 'customers', 'collections', 'inventory'],
    actions: [
      'Create product', 'Update product', 'List orders',
      'Create order', 'Update inventory', 'Create customer',
    ],
    triggers: [
      'New order', 'Order fulfilled', 'Product created',
      'Customer created', 'Checkout completed',
    ],
    fields: {
      orders: ['customer', 'lineItems', 'totalPrice', 'fulfillmentStatus', 'shippingAddress'],
      products: ['title', 'description', 'price', 'inventory', 'images', 'variants'],
    },
  },

  twilio: {
    name: 'Twilio',
    logo: 'twilio',
    category: 'Communication',
    dataTypes: ['messages', 'calls', 'phone_numbers'],
    actions: [
      'Send SMS', 'Make call', 'Send WhatsApp',
      'List messages', 'Get call recording',
    ],
    triggers: [
      'SMS received', 'Call completed', 'Voicemail received',
    ],
    fields: {
      messages: ['to', 'from', 'body', 'mediaUrl'],
    },
  },

  discord: {
    name: 'Discord',
    logo: 'discord',
    category: 'Communication',
    dataTypes: ['channels', 'messages', 'guilds', 'members'],
    actions: [
      'Send message', 'Create channel', 'Add role',
      'Send embed', 'Pin message',
    ],
    triggers: [
      'Message received', 'Member joined', 'Reaction added',
    ],
    fields: {
      messages: ['channelId', 'content', 'embeds'],
    },
  },
}

/**
 * Returns a formatted string of all service capabilities for injection into AI prompts.
 * Used by the engine to give the AI deep awareness of what each service can do.
 */
export function buildServiceCapabilitiesPrompt(connectedServices: string[]): string {
  if (connectedServices.length === 0) return 'No services connected yet.'

  const blocks = connectedServices
    .map(key => SERVICE_CAPABILITIES[key])
    .filter(Boolean)
    .map(svc => {
      return `### ${svc.name} (${svc.category})
Data: ${svc.dataTypes.join(', ')}
Actions: ${svc.actions.join(' | ')}
Triggers: ${svc.triggers.join(' | ')}`
    })

  return `CONNECTED SERVICES — what you can actually DO with each:\n\n${blocks.join('\n\n')}`
}

/**
 * Returns all available services for the automation palette.
 */
export function getAllServiceNames(): string[] {
  return Object.keys(SERVICE_CAPABILITIES)
}
