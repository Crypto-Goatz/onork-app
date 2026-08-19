/**
 * Blog-to-Social-to-Email Workflow Engine
 *
 * Orchestrates: AI writes blog -> generates social snippets -> posts to platforms
 * -> generates email -> sends via CRM -> replies to conversation
 *
 * All AI generation uses Groq (openai/gpt-oss-120b).
 * Social posting and email go through CRM APIs.
 */

import { createClient } from '@supabase/supabase-js'
import { crmGet, crmPost, getAuthForLocation } from '@/lib/crm'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

// -- Types ------------------------------------------------------------------

export interface WorkflowInput {
  topic: string
  tone?: 'professional' | 'casual' | 'thought-leader' | 'educational'
  platforms?: string[]
  emailSegment?: string
  emailSubject?: string
  locationId: string
  userId?: string
  conversationId?: string
}

export interface WorkflowResult {
  blogPost: { title: string; content: string; metaDescription: string; tags: string[] }
  socialPosts: { platform: string; content: string; posted: boolean; postId?: string; error?: string }[]
  emailCampaign: { subject: string; html: string; sent: number; segment: string }
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  name: string
  status: 'completed' | 'failed' | 'skipped'
  duration_ms: number
  detail?: string
}

// -- Helpers ----------------------------------------------------------------

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function groqChat(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY not configured')

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.maxTokens ?? 4096,
  }
  if (opts?.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseJson(raw: string): Record<string, unknown> {
  let str = raw
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) str = fenced[1].trim()
  const obj = str.match(/\{[\s\S]*\}/)
  if (obj) str = obj[0]
  return JSON.parse(str)
}

async function timed<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; step: WorkflowStep }> {
  const start = Date.now()
  try {
    const result = await fn()
    return {
      result,
      step: { name, status: 'completed', duration_ms: Date.now() - start },
    }
  } catch (err) {
    return {
      result: undefined as T,
      step: {
        name,
        status: 'failed',
        duration_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      },
    }
  }
}

// -- Step 1: Generate Blog Post ---------------------------------------------

interface BlogOutput {
  title: string
  content: string
  metaDescription: string
  tags: string[]
}

async function generateBlogPost(topic: string, tone: string): Promise<BlogOutput> {
  const systemPrompt = `You are a professional content writer. Write a complete blog post with title, introduction, 3-5 sections with headers, and a conclusion. Use markdown formatting. Make it SEO-optimized with natural keyword usage. The post should be 800-1200 words.

Return your response as valid JSON:
{
  "title": "The blog post title",
  "content": "Full markdown content of the blog post",
  "metaDescription": "150 char meta description for SEO",
  "tags": ["tag1", "tag2", "tag3"]
}`

  const userPrompt = `Write a blog post about: ${topic}\nTone: ${tone}`
  const raw = await groqChat(systemPrompt, userPrompt, { maxTokens: 6000, jsonMode: true })
  const parsed = parseJson(raw) as unknown as BlogOutput
  if (!parsed.title || !parsed.content) {
    throw new Error('Blog generation returned incomplete data')
  }
  return parsed
}

// -- Step 2: Generate Social Snippets ---------------------------------------

interface SocialSnippet {
  platform: string
  content: string
}

async function generateSocialSnippets(
  blogTitle: string,
  blogContent: string,
  platforms: string[]
): Promise<SocialSnippet[]> {
  const platformInstructions: Record<string, string> = {
    twitter: 'Twitter/X: Max 280 chars. Punchy hook + key insight. 1-2 hashtags.',
    linkedin: 'LinkedIn: 200-400 words. Professional insight format. Open with bold statement. End with CTA. 3-5 hashtags.',
    facebook: 'Facebook: 100-200 words. Conversational, ask a question. Include CTA.',
    instagram: 'Instagram: Caption 100-200 words. Storytelling. 8-12 hashtags at end separated by line break.',
    google: 'Google Business: 100-150 words. Local/business focused. Professional tone.',
    tiktok: 'TikTok: Short punchy caption under 150 chars. Trending hashtags.',
    tiktok_business: 'TikTok Business: Short punchy caption under 150 chars. Business-oriented hashtags.',
  }

  const blocks = platforms
    .map(p => `### ${p}\n${platformInstructions[p] || `${p}: Write a suitable promotional post.`}`)
    .join('\n\n')

  const systemPrompt = `You are a social media content specialist. Generate platform-specific posts promoting a blog article. Each post should be tailored to the platform audience and format.

Return valid JSON:
{
  "posts": [
    { "platform": "platform_key", "content": "the post content" }
  ]
}`

  const userPrompt = `Blog Title: ${blogTitle}
Blog Content (first 500 chars): ${blogContent.slice(0, 500)}

Generate posts for these platforms:
${blocks}`

  const raw = await groqChat(systemPrompt, userPrompt, { jsonMode: true })
  const parsed = parseJson(raw) as { posts?: SocialSnippet[] }
  return parsed.posts || []
}

// -- Step 3: Post to Social via CRM ----------------------------------------

interface PostResult {
  platform: string
  posted: boolean
  postId?: string
  error?: string
}

async function postToSocialCRM(
  snippets: SocialSnippet[],
  locationId: string
): Promise<PostResult[]> {
  const auth = await getAuthForLocation(locationId)
  const token = auth.token
  if (!token) {
    return snippets.map(s => ({ platform: s.platform, posted: false, error: 'No CRM auth token available' }))
  }

  // Fetch connected social accounts
  let accountMap: Record<string, string> = {}
  try {
    const accRes = await fetch(`${CRM_API}/social-media-posting/${locationId}/accounts`, {
      headers: { Authorization: `Bearer ${token}`, Version: CRM_VERSION },
    })
    if (accRes.ok) {
      const accData = await accRes.json()
      const accounts = accData.accounts || accData || []
      for (const acc of accounts) {
        const type = (acc.type || acc.platform || acc.provider || '').toLowerCase()
        if (type && acc.id) {
          accountMap[type] = acc.id
          if (type === 'google_business' || type === 'gmb') accountMap['google'] = acc.id
          if (type === 'x') accountMap['twitter'] = acc.id
        }
      }
    }
  } catch {
    // Continue without account map
  }

  const results: PostResult[] = []

  for (const snippet of snippets) {
    const accountId = accountMap[snippet.platform]
    if (!accountId) {
      results.push({ platform: snippet.platform, posted: false, error: `${snippet.platform} not connected` })
      continue
    }

    try {
      const body: Record<string, unknown> = {
        accountIds: [accountId],
        summary: snippet.content,
        type: 'post',
        status: 'draft',
      }

      // Platform-specific details
      if (snippet.platform === 'facebook') body.facebookPostDetails = { type: 'post' }
      if (snippet.platform === 'instagram') body.instagramPostDetails = { type: 'post', showOnFeed: true }
      if (snippet.platform === 'linkedin') body.linkedinPostDetails = {}

      const res = await fetch(`${CRM_API}/social-media-posting/${locationId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        results.push({ platform: snippet.platform, posted: true, postId: data.id || data.postId })
      } else {
        const err = await res.text()
        results.push({ platform: snippet.platform, posted: false, error: `CRM ${res.status}: ${err.slice(0, 150)}` })
      }
    } catch (err) {
      results.push({
        platform: snippet.platform,
        posted: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return results
}

// -- Step 4: Generate Email -------------------------------------------------

interface EmailOutput {
  subject: string
  preheader: string
  html: string
}

async function generateEmail(
  blogTitle: string,
  blogContent: string,
  tone: string,
  customSubject?: string
): Promise<EmailOutput> {
  const systemPrompt = `You are an expert email marketer. Generate a promotional email for a new blog post.
The email should:
- Be responsive HTML using table-based layout with inline styles
- Max width 600px, centered
- Include a compelling subject line
- Include preview/preheader text
- Summarize the blog post highlights (not the full post)
- Include a clear CTA button linking to the blog
- Professional footer with unsubscribe placeholder
- Clean, modern design with dark theme (#0d1117 background, #f0f4f8 text, #7ed957 accent)

Tone: ${tone}

Return valid JSON:
{
  "subject": "email subject line",
  "preheader": "preview text shown in inbox",
  "html": "complete HTML email"
}`

  const userPrompt = `Blog Title: ${blogTitle}
Blog Summary: ${blogContent.slice(0, 800)}
${customSubject ? `Preferred Subject: ${customSubject}` : 'Generate a compelling subject line.'}`

  const raw = await groqChat(systemPrompt, userPrompt, { maxTokens: 6000, jsonMode: true })
  const parsed = parseJson(raw) as unknown as EmailOutput
  if (!parsed.html) throw new Error('Email generation returned no HTML')
  return parsed
}

// -- Step 5: Send Email via CRM ---------------------------------------------

async function sendEmailCRM(
  locationId: string,
  emailHtml: string,
  subject: string,
  segment: string
): Promise<{ sent: number; errors: string[] }> {
  const auth = await getAuthForLocation(locationId)
  const token = auth.token
  if (!token) return { sent: 0, errors: ['No CRM auth token'] }

  // Fetch contacts based on segment
  let contactsUrl = `/contacts/?locationId=${locationId}&limit=100`
  if (segment === 'customers') {
    contactsUrl += '&query=tag:customer'
  } else if (segment === 'leads') {
    contactsUrl += '&query=tag:lead'
  } else if (segment === 'active') {
    contactsUrl += '&query=tag:active'
  } else if (segment !== 'all' && segment) {
    contactsUrl += `&query=tag:${segment}`
  }

  let contacts: { id: string; email?: string; firstName?: string }[] = []
  try {
    const res = await fetch(`${CRM_API}${contactsUrl}`, {
      headers: { Authorization: `Bearer ${token}`, Version: CRM_VERSION },
    })
    if (res.ok) {
      const data = await res.json()
      contacts = (data.contacts || []).filter((c: { email?: string }) => c.email)
    }
  } catch {
    return { sent: 0, errors: ['Failed to fetch contacts from CRM'] }
  }

  if (contacts.length === 0) {
    return { sent: 0, errors: [`No contacts found for segment "${segment}"`] }
  }

  let sent = 0
  const errors: string[] = []

  // Send email to each contact via CRM conversations API
  for (const contact of contacts) {
    try {
      const res = await fetch(`${CRM_API}/conversations/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'Email',
          contactId: contact.id,
          subject,
          html: emailHtml,
          emailFrom: `noreply@${locationId}.0ncore.com`,
          locationId,
        }),
      })

      if (res.ok) {
        sent++
      } else {
        const err = await res.text()
        if (errors.length < 3) errors.push(`${contact.email}: ${err.slice(0, 100)}`)
      }
    } catch (err) {
      if (errors.length < 3) {
        errors.push(`${contact.email}: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }
  }

  return { sent, errors }
}

// -- Step 6: Reply to CRM Conversation --------------------------------------

async function replyToConversation(
  locationId: string,
  conversationId: string,
  summary: string
): Promise<void> {
  const auth = await getAuthForLocation(locationId)
  const token = auth.token
  if (!token) return

  await fetch(`${CRM_API}/conversations/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Version: CRM_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'Custom',
      conversationId,
      message: summary,
      locationId,
    }),
  }).catch(() => {})
}

// -- Main Orchestrator ------------------------------------------------------

export async function runBlogToSocialWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  const {
    topic,
    tone = 'professional',
    platforms = ['linkedin', 'twitter', 'facebook'],
    emailSegment = 'all',
    emailSubject,
    locationId,
    userId,
    conversationId,
  } = input

  const supabase = getAdmin()
  const steps: WorkflowStep[] = []

  // Create execution record
  const { data: execRow } = await supabase
    .from('workflow_executions')
    .insert({
      user_id: userId || null,
      location_id: locationId,
      workflow_type: 'blog-to-social',
      input: input as unknown as Record<string, unknown>,
      status: 'running',
    })
    .select('id')
    .single()

  const executionId = execRow?.id

  // Helper to update steps in DB
  async function updateSteps() {
    if (!executionId) return
    await supabase
      .from('workflow_executions')
      .update({ steps: steps as unknown as Record<string, unknown>[] })
      .eq('id', executionId)
      .then(() => {})
  }

  // -- Step 1: Generate blog post
  const blogResult = await timed('Generate Blog Post', () => generateBlogPost(topic, tone))
  steps.push(blogResult.step)
  await updateSteps()

  const blog = blogResult.result || { title: topic, content: '', metaDescription: '', tags: [] }

  // -- Step 2: Generate social snippets
  const socialResult = await timed('Generate Social Snippets', () =>
    generateSocialSnippets(blog.title, blog.content, platforms)
  )
  steps.push(socialResult.step)
  await updateSteps()

  const snippets = socialResult.result || []

  // -- Step 3: Post to social
  const postResult = await timed('Post to Social Platforms', () =>
    postToSocialCRM(snippets, locationId)
  )
  steps.push(postResult.step)
  await updateSteps()

  const postResults = postResult.result || []

  // -- Step 4: Generate email
  const emailGenResult = await timed('Generate Email Campaign', () =>
    generateEmail(blog.title, blog.content, tone, emailSubject)
  )
  steps.push(emailGenResult.step)
  await updateSteps()

  const email = emailGenResult.result || { subject: emailSubject || blog.title, preheader: '', html: '' }

  // -- Step 5: Send email
  const emailSendResult = await timed('Send Email Campaign', () =>
    sendEmailCRM(locationId, email.html, email.subject, emailSegment)
  )
  steps.push(emailSendResult.step)
  await updateSteps()

  const emailStats = emailSendResult.result || { sent: 0, errors: [] }

  // Build social posts result merging snippets + post results
  const socialPosts = snippets.map(s => {
    const pr = postResults.find(r => r.platform === s.platform)
    return {
      platform: s.platform,
      content: s.content,
      posted: pr?.posted ?? false,
      postId: pr?.postId,
      error: pr?.error,
    }
  })

  const result: WorkflowResult = {
    blogPost: blog,
    socialPosts,
    emailCampaign: {
      subject: email.subject,
      html: email.html,
      sent: emailStats.sent,
      segment: emailSegment,
    },
    steps,
  }

  // -- Step 6: Reply to conversation
  if (conversationId) {
    const platformNames = socialPosts.filter(p => p.posted).map(p => p.platform).join(', ')
    const summary = [
      `Blog-to-Social workflow complete!`,
      ``,
      `Blog: "${blog.title}"`,
      platformNames ? `Posted to: ${platformNames}` : 'Social: No platforms posted (check connections)',
      `Email: Sent to ${emailStats.sent} contacts (segment: ${emailSegment})`,
      ``,
      steps.map(s => `${s.status === 'completed' ? '[OK]' : '[!!]'} ${s.name} (${s.duration_ms}ms)`).join('\n'),
    ].join('\n')

    const replyResult = await timed('Reply to Conversation', () =>
      replyToConversation(locationId, conversationId, summary)
    )
    steps.push(replyResult.step)
  }

  // Finalize execution record
  const hasFailure = steps.some(s => s.status === 'failed')
  if (executionId) {
    await supabase
      .from('workflow_executions')
      .update({
        result: result as unknown as Record<string, unknown>,
        steps: steps as unknown as Record<string, unknown>[],
        status: hasFailure ? 'partial' : 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
  }

  return result
}

// -- Input Extraction (for free-text webhook messages) ----------------------

export async function extractWorkflowInput(message: string): Promise<Partial<WorkflowInput>> {
  const systemPrompt = `You extract structured workflow parameters from a natural language message. The user wants to create a blog post, promote it on social media, and optionally email contacts.

Return valid JSON:
{
  "topic": "the blog topic extracted from the message",
  "tone": "professional" | "casual" | "thought-leader" | "educational",
  "platforms": ["linkedin", "twitter", "facebook", "instagram", "google", "tiktok"],
  "emailSegment": "all" | "active" | "leads" | "customers" | or a custom tag,
  "emailSubject": null or a subject line if specified
}

If the user does not specify platforms, default to ["linkedin", "twitter", "facebook"].
If the user does not specify email segment, default to "all".
If the user does not specify tone, default to "professional".`

  const raw = await groqChat(systemPrompt, message, { jsonMode: true, temperature: 0.3 })
  return parseJson(raw) as Partial<WorkflowInput>
}
