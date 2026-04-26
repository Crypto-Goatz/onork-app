// lib/crm/sdk.ts — Client-side CRM SDK
// Every CRM dashboard page uses this. All calls go through /api/crm/proxy.
// No direct CRM API calls from the client. No token management needed.

async function crmCall<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch('/api/crm/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, body }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `CRM error ${res.status}`)
  return data as T
}

// ═══════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════

export interface Contact {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phone?: string
  companyName?: string
  tags?: string[]
  source?: string
  dateAdded?: string
  dateUpdated?: string
  customFields?: Array<{ id: string; key: string; value: unknown; field_value: unknown }>
}

export const contacts = {
  list: (params?: { limit?: number; skip?: number; query?: string; sortBy?: string; order?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.skip) qs.set('skip', String(params.skip))
    if (params?.query) qs.set('query', params.query)
    if (params?.sortBy) qs.set('sortBy', params.sortBy)
    if (params?.order) qs.set('order', params.order)
    return crmCall<{ contacts: Contact[]; total: number; count: number }>('GET', `/contacts/?${qs}`)
  },
  get: (id: string) => crmCall<{ contact: Contact }>('GET', `/contacts/${id}`),
  create: (data: Partial<Contact>) => crmCall<{ contact: Contact }>('POST', '/contacts/', data),
  update: (id: string, data: Partial<Contact>) => crmCall<{ contact: Contact }>('PUT', `/contacts/${id}`, data),
  delete: (id: string) => crmCall('DELETE', `/contacts/${id}`),
  search: (params: { query?: string; email?: string; phone?: string }) => {
    const qs = new URLSearchParams()
    if (params.query) qs.set('query', params.query)
    if (params.email) qs.set('email', params.email)
    if (params.phone) qs.set('phone', params.phone)
    return crmCall<{ contacts: Contact[] }>('GET', `/contacts/search/duplicate?${qs}`)
  },
  addTags: (id: string, tags: string[]) => crmCall('POST', `/contacts/${id}/tags`, { tags }),
  removeTags: (id: string, tags: string[]) => crmCall('DELETE', `/contacts/${id}/tags`, { tags }),
  addNote: (id: string, body: string) => crmCall('POST', `/contacts/${id}/notes`, { body }),
  getNotes: (id: string) => crmCall<{ notes: Array<{ id: string; body: string; dateAdded: string }> }>('GET', `/contacts/${id}/notes`),
  getTasks: (id: string) => crmCall<{ tasks: Array<{ id: string; title: string; dueDate: string; completed: boolean }> }>('GET', `/contacts/${id}/tasks`),
  addTask: (id: string, data: { title: string; dueDate?: string; description?: string }) => crmCall('POST', `/contacts/${id}/tasks`, data),
}

// ═══════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════

export interface Conversation {
  id: string
  contactId: string
  type: string
  lastMessageBody?: string
  lastMessageDate?: string
  unreadCount?: number
}

export interface ConversationMessage {
  id: string
  body: string
  type: number
  direction: string
  status: string
  dateAdded: string
  contactId: string
  conversationId: string
}

export const conversations = {
  list: (params?: { limit?: number; skip?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.skip) qs.set('skip', String(params.skip))
    return crmCall<{ conversations: Conversation[] }>('GET', `/conversations/?${qs}`)
  },
  get: (id: string) => crmCall<{ conversation: Conversation }>('GET', `/conversations/${id}`),
  getMessages: (id: string) => crmCall<{ messages: { messages: ConversationMessage[] } }>('GET', `/conversations/${id}/messages`),
  send: (conversationId: string, data: { type: string; message: string; contactId: string }) =>
    crmCall('POST', `/conversations/messages`, { ...data, conversationId }),
  search: (contactId: string) => crmCall<{ conversations: Conversation[] }>('GET', `/conversations/search?contactId=${contactId}`),
  sendEmail: (data: {
    contactId: string
    subject: string
    body: string
    emailFrom?: string
    html?: string
  }) => crmCall('POST', '/conversations/messages', {
    type: 'Email',
    contactId: data.contactId,
    subject: data.subject,
    message: data.body,
    html: data.html || data.body,
    emailFrom: data.emailFrom || 'noreply@0nmcp.com',
  }),
  sendSMS: (data: { contactId: string; message: string }) =>
    crmCall('POST', '/conversations/messages', {
      type: 'SMS',
      contactId: data.contactId,
      message: data.message,
    }),
}

// ═══════════════════════════════════════════════════════
// EMAILS (TEMPLATES + SCHEDULING)
// ═══════════════════════════════════════════════════════

export const emails = {
  templates: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    return crmCall<{ templates: Array<{ id: string; name: string; type: string }> }>('GET', `/emails/builder?${qs}`)
  },
  getTemplate: (id: string) => crmCall<{ template: Record<string, unknown> }>('GET', `/emails/builder/${id}`),
  scheduled: (params?: { limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    return crmCall<{ schedules: Array<{ id: string; name: string; status: string; scheduledAt: string }> }>('GET', `/emails/schedule?${qs}`)
  },
}

// ═══════════════════════════════════════════════════════
// OPPORTUNITIES (PIPELINE)
// ═══════════════════════════════════════════════════════

export interface Pipeline {
  id: string
  name: string
  stages: PipelineStage[]
}

export interface PipelineStage {
  id: string
  name: string
  position: number
}

export interface Opportunity {
  id: string
  name: string
  monetaryValue?: number
  status: string
  pipelineId: string
  pipelineStageId: string
  contactId?: string
  contact?: Contact
  dateAdded?: string
  dateUpdated?: string
  customFields?: Array<{ id: string; key: string; value: unknown }>
}

export const opportunities = {
  pipelines: () => crmCall<{ pipelines: Pipeline[] }>('GET', '/opportunities/pipelines'),
  list: (pipelineId: string, params?: { limit?: number; skip?: number; stageId?: string; status?: string }) => {
    const qs = new URLSearchParams({ pipelineId })
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.skip) qs.set('skip', String(params.skip))
    if (params?.stageId) qs.set('stageId', params.stageId)
    if (params?.status) qs.set('status', params.status)
    return crmCall<{ opportunities: Opportunity[] }>('GET', `/opportunities/search?${qs}`)
  },
  get: (id: string) => crmCall<{ opportunity: Opportunity }>('GET', `/opportunities/${id}`),
  create: (data: { pipelineId: string; pipelineStageId: string; name: string; contactId?: string; monetaryValue?: number; status?: string }) =>
    crmCall<{ opportunity: Opportunity }>('POST', '/opportunities/', data),
  update: (id: string, data: Partial<Opportunity>) => crmCall('PUT', `/opportunities/${id}`, data),
  delete: (id: string) => crmCall('DELETE', `/opportunities/${id}`),
  updateStage: (id: string, stageId: string) => crmCall('PUT', `/opportunities/${id}`, { pipelineStageId: stageId }),
}

// ═══════════════════════════════════════════════════════
// CALENDARS + APPOINTMENTS
// ═══════════════════════════════════════════════════════

export interface CalendarEvent {
  id: string
  title: string
  calendarId: string
  contactId?: string
  startTime: string
  endTime: string
  status: string
  appointmentStatus?: string
}

export interface CalendarResource {
  id: string
  name: string
  description?: string
  slug?: string
}

export const calendars = {
  list: () => crmCall<{ calendars: CalendarResource[] }>('GET', '/calendars/'),
  getSlots: (calendarId: string, startDate: string, endDate: string) => {
    const qs = new URLSearchParams({ calendarId, startDate, endDate })
    return crmCall<{ slots: Record<string, string[]> }>('GET', `/calendars/${calendarId}/free-slots?${qs}`)
  },
  getAppointments: (params?: { calendarId?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams()
    if (params?.calendarId) qs.set('calendarId', params.calendarId)
    if (params?.startDate) qs.set('startDate', params.startDate)
    if (params?.endDate) qs.set('endDate', params.endDate)
    return crmCall<{ events: CalendarEvent[] }>('GET', `/calendars/events?${qs}`)
  },
  bookAppointment: (data: { calendarId: string; contactId: string; startTime: string; endTime: string; title?: string }) =>
    crmCall('POST', '/calendars/events/appointments', data),
  updateAppointment: (eventId: string, data: Partial<CalendarEvent>) => crmCall('PUT', `/calendars/events/appointments/${eventId}`, data),
  deleteAppointment: (eventId: string) => crmCall('DELETE', `/calendars/events/appointments/${eventId}`),
}

// ═══════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════

export interface Invoice {
  _id: string
  name: string
  contactId?: string
  total: number
  amountDue: number
  status: string
  currency: string
  dueDate?: string
  createdAt: string
  items?: Array<{ name: string; amount: number; qty: number }>
}

export const invoices = {
  list: (params?: { limit?: number; offset?: number; status?: string; contactId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    if (params?.status) qs.set('status', params.status)
    if (params?.contactId) qs.set('contactId', params.contactId)
    return crmCall<{ invoices: Invoice[]; total: number }>('GET', `/invoices/?${qs}`)
  },
  get: (id: string) => crmCall<{ invoice: Invoice }>('GET', `/invoices/${id}`),
  create: (data: Record<string, unknown>) => crmCall<{ invoice: Invoice }>('POST', '/invoices/', data),
  update: (id: string, data: Record<string, unknown>) => crmCall('PUT', `/invoices/${id}`, data),
  delete: (id: string) => crmCall('DELETE', `/invoices/${id}`),
  send: (id: string) => crmCall('POST', `/invoices/${id}/send`),
  void: (id: string) => crmCall('POST', `/invoices/${id}/void`),
  record: (id: string, data: { amount: number; mode: string }) => crmCall('POST', `/invoices/${id}/record-payment`, data),
}

// ═══════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════

export const payments = {
  list: (params?: { limit?: number; offset?: number; contactId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    if (params?.contactId) qs.set('contactId', params.contactId)
    return crmCall<{ data: Array<{ id: string; amount: number; status: string; createdAt: string }> }>('GET', `/payments/transactions?${qs}`)
  },
  subscriptions: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    return crmCall<{ data: Array<{ id: string; name: string; status: string; amount: number }> }>('GET', `/payments/subscriptions?${qs}`)
  },
  orders: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    return crmCall<{ data: Array<{ id: string; amount: number; status: string }> }>('GET', `/payments/orders?${qs}`)
  },
}

// ═══════════════════════════════════════════════════════
// SOCIAL MEDIA
// ═══════════════════════════════════════════════════════

export interface SocialAccount {
  id: string
  name: string
  platform: string
  type: string
  avatar?: string
}

export interface SocialPost {
  id: string
  status: string
  summary: string
  scheduledDate?: string
  accountIds: string[]
  type: string
}

export const social = {
  accounts: () => crmCall<{ accounts: SocialAccount[] }>('GET', '/social-media-posting/oauth'),
  connect: (platform: string) => crmCall<{ url?: string; authUrl?: string; redirectUrl?: string }>('GET', `/social-media-posting/oauth/${platform}/start?originUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://0ncore.com/dashboard/crm/social')}`),
  posts: (params?: { limit?: number; skip?: number; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.skip) qs.set('skip', String(params.skip))
    if (params?.status) qs.set('status', params.status)
    return crmCall<{ posts: SocialPost[] }>('GET', `/social-media-posting/posts?${qs}`)
  },
  createPost: (data: { summary: string; scheduledDate: string; accountIds: string[]; type?: string; mediaUrls?: string[] }) =>
    crmCall<{ post: SocialPost }>('POST', '/social-media-posting/posts', data),
  deletePost: (id: string) => crmCall('DELETE', `/social-media-posting/posts/${id}`),
  categories: () => crmCall<{ categories: Array<{ id: string; name: string }> }>('GET', '/social-media-posting/categories'),
  tags: () => crmCall<{ tags: Array<{ id: string; name: string }> }>('GET', '/social-media-posting/tags'),
}

// ═══════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════

export const users = {
  list: () => crmCall<{ users: Array<{ id: string; name: string; email: string; role: string }> }>('GET', '/users/'),
  get: (id: string) => crmCall('GET', `/users/${id}`),
}

// ═══════════════════════════════════════════════════════
// WORKFLOWS
// ═══════════════════════════════════════════════════════

export const workflows = {
  list: () => crmCall<{ workflows: Array<{ id: string; name: string; status: string; version: number }> }>('GET', '/workflows/'),
  get: (id: string) => crmCall('GET', `/workflows/${id}`),
}

// ═══════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════

export const products = {
  list: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    return crmCall<{ products: Array<{ _id: string; name: string; description: string; prices: Array<{ amount: number; currency: string; type: string }> }> }>('GET', `/products/?${qs}`)
  },
  get: (id: string) => crmCall('GET', `/products/${id}`),
  create: (data: Record<string, unknown>) => crmCall('POST', '/products/', data),
}

// ═══════════════════════════════════════════════════════
// TAGS
// ═══════════════════════════════════════════════════════

export const tags = {
  list: () => crmCall<{ tags: Array<{ id: string; name: string }> }>('GET', '/locations/tags'),
  create: (name: string) => crmCall('POST', '/locations/tags', { name }),
  delete: (id: string) => crmCall('DELETE', `/locations/tags/${id}`),
}

// ═══════════════════════════════════════════════════════
// CUSTOM FIELDS
// ═══════════════════════════════════════════════════════

export const customFields = {
  list: (model?: string) => {
    const qs = model ? `?model=${model}` : ''
    return crmCall<{ customFields: Array<{ id: string; name: string; fieldKey: string; dataType: string }> }>('GET', `/locations/customFields${qs}`)
  },
  create: (data: { name: string; dataType: string; model?: string }) => crmCall('POST', '/locations/customFields', data),
}

// ═══════════════════════════════════════════════════════
// CUSTOM VALUES
// ═══════════════════════════════════════════════════════

export const customValues = {
  list: () => crmCall<{ customValues: Array<{ id: string; name: string; fieldKey: string; value: string }> }>('GET', '/locations/customValues'),
  create: (data: { name: string; value: string }) => crmCall('POST', '/locations/customValues', data),
  update: (id: string, data: { name: string; value: string }) => crmCall('PUT', `/locations/customValues/${id}`, data),
}

// ═══════════════════════════════════════════════════════
// FORMS + SURVEYS
// ═══════════════════════════════════════════════════════

export const forms = {
  list: (params?: { limit?: number; skip?: number; type?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.skip) qs.set('skip', String(params.skip))
    if (params?.type) qs.set('type', params.type)
    return crmCall<{ forms: Array<{ id: string; name: string; type: string }> }>('GET', `/forms/?${qs}`)
  },
  submissions: (formId: string, params?: { limit?: number; page?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.page) qs.set('page', String(params.page))
    return crmCall<{ submissions: Array<{ id: string; contactId: string; createdAt: string; data: Record<string, unknown> }> }>('GET', `/forms/submissions?formId=${formId}&${qs}`)
  },
}

// ═══════════════════════════════════════════════════════
// FUNNELS
// ═══════════════════════════════════════════════════════

export const funnels = {
  list: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    return crmCall<{ funnels: Array<{ id: string; name: string; steps: Array<{ id: string; name: string }> }> }>('GET', `/funnels/funnel/list?${qs}`)
  },
}

// ═══════════════════════════════════════════════════════
// MEDIA (FILES)
// ═══════════════════════════════════════════════════════

export const media = {
  list: (params?: { limit?: number; offset?: number; sortBy?: string; order?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    if (params?.sortBy) qs.set('sortBy', params.sortBy)
    return crmCall<{ files: Array<{ id: string; name: string; url: string; type: string; size: number }> }>('GET', `/medias/files?${qs}`)
  },
  delete: (id: string) => crmCall('DELETE', `/medias/${id}`),
}

// ═══════════════════════════════════════════════════════
// EMAIL CAMPAIGNS
// ═══════════════════════════════════════════════════════

export const campaigns = {
  list: (params?: { limit?: number; offset?: number; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.status) qs.set('status', params.status)
    return crmCall<{ campaigns: Array<{ id: string; name: string; status: string; stats: Record<string, number> }> }>('GET', `/campaigns/?${qs}`)
  },
}

// ═══════════════════════════════════════════════════════
// LOCATION (SETTINGS)
// ═══════════════════════════════════════════════════════

export const location = {
  get: () => crmCall<{ location: Record<string, unknown> }>('GET', '/locations/'),
  update: (data: Record<string, unknown>) => crmCall('PUT', '/locations/', data),
}
