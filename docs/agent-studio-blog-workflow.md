# Blog-to-Social Workflow -- CRM Agent Studio Setup

This document explains how to connect the Blog-to-Social-to-Email workflow engine to a CRM Agent Studio agent, so users can trigger full content workflows from a CRM conversation.

---

## Overview

When triggered, this workflow:
1. Uses AI (Groq / llama-3.3-70b) to write a full blog post on the given topic
2. Generates platform-specific social media posts (LinkedIn, Twitter/X, Facebook, Instagram, etc.)
3. Posts to all connected social accounts via the CRM Social Planner API
4. Generates an email version of the blog content
5. Sends the email to a contact segment via the CRM Conversations API
6. Replies back to the CRM conversation with a summary of what was done

---

## Webhook URL

```
https://0ncore.com/api/workflows/blog-to-social
```

Method: `POST`
Content-Type: `application/json`

---

## Authentication

The webhook accepts three forms of authentication (in order of priority):

1. **Webhook Secret** (recommended for Agent Studio):
   Header: `x-webhook-secret: <your-secret>`
   Set the env var `WORKFLOW_WEBHOOK_SECRET` on the 0nCore deployment.

2. **CRM PIT Token**:
   Header: `x-crm-pit: <pit-token>`
   Any valid PIT token from the environment is accepted.

3. **Bearer Token** (for dashboard users):
   Header: `Authorization: Bearer <supabase-jwt>`

---

## Request Payload

The agent should send one of two formats:

### Option A: Free-text message (recommended for Agent Studio)

The AI will parse the message and extract structured parameters automatically.

```json
{
  "type": "webhook",
  "locationId": "{{location.id}}",
  "contactId": "{{contact.id}}",
  "conversationId": "{{conversation.id}}",
  "message": "Write a blog about AI automation for small businesses and promote it on LinkedIn and Twitter"
}
```

### Option B: Structured parameters

```json
{
  "topic": "AI automation for small businesses",
  "tone": "professional",
  "platforms": ["linkedin", "twitter", "facebook"],
  "emailSegment": "active",
  "emailSubject": "How AI is Changing Small Business",
  "locationId": "{{location.id}}",
  "conversationId": "{{conversation.id}}"
}
```

### Parameter Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `topic` | string | required | The blog topic |
| `tone` | string | `professional` | One of: professional, casual, thought-leader, educational |
| `platforms` | string[] | `["linkedin","twitter","facebook"]` | Social platforms to post to |
| `emailSegment` | string | `all` | Contact segment: all, active, leads, customers, or a custom CRM tag |
| `emailSubject` | string | auto-generated | Custom email subject line |
| `locationId` | string | required | CRM location ID |
| `conversationId` | string | optional | If provided, the workflow replies back with a summary |
| `message` | string | optional | Free-text alternative to structured params |

---

## Agent Studio Configuration

### Step 1: Create a New Agent

1. Go to Agent Studio in the CRM
2. Create a new agent named "Content Engine" (or similar)
3. Set the agent type to "Webhook"

### Step 2: System Prompt

Paste this into the agent's system prompt:

```
You are the 0nCore Content Engine. When a user asks you to create content, write a blog, or promote something, you call the blog-to-social workflow webhook.

You handle requests like:
- "Write a blog about [topic]"
- "Create content about [topic] and promote it"
- "Publish a post about [topic] to LinkedIn and Twitter"
- "Write about [topic] and email it to my leads"

When triggered, send a webhook to https://0ncore.com/api/workflows/blog-to-social with:
- message: the user's full request
- locationId: the current location ID
- conversationId: the current conversation ID (so results are sent back)

The workflow will:
1. Write a full blog post using AI
2. Create social media posts for each platform
3. Post to connected social accounts
4. Generate and send an email campaign
5. Reply back with a summary

If the user specifies a tone (professional, casual, thought-leader, educational), include it.
If the user specifies platforms (LinkedIn, Twitter, Facebook, Instagram, TikTok), include them.
If the user specifies an email segment (all, active, leads, customers), include it.
```

### Step 3: Webhook Action

1. Add a "Webhook" action node
2. URL: `https://0ncore.com/api/workflows/blog-to-social`
3. Method: POST
4. Headers:
   - `Content-Type: application/json`
   - `x-webhook-secret: <your-webhook-secret>`
5. Body template:
```json
{
  "message": "{{message}}",
  "locationId": "{{location.id}}",
  "conversationId": "{{conversation.id}}"
}
```

### Step 4: Trigger Keywords

Configure the agent to trigger on these keywords/phrases:
- "write a blog"
- "create content"
- "promote"
- "publish"
- "blog about"
- "write about"
- "content about"
- "social post about"
- "email campaign about"

---

## Example Conversation Flow

```
User: Write a blog about how AI is transforming customer service in 2026
       and promote it on LinkedIn and Twitter. Email it to my active contacts.

Agent: [Calls webhook with message]

... (workflow runs, typically 15-30 seconds) ...

Agent: Blog-to-Social workflow complete!

       Blog: "How AI is Transforming Customer Service in 2026"
       Posted to: linkedin, twitter
       Email: Sent to 47 contacts (segment: active)

       [OK] Generate Blog Post (3.2s)
       [OK] Generate Social Snippets (1.8s)
       [OK] Post to Social Platforms (2.1s)
       [OK] Generate Email Campaign (2.5s)
       [OK] Send Email Campaign (8.4s)
       [OK] Reply to Conversation (0.3s)
```

---

## Status Endpoint

To check the status of a running workflow execution:

```
GET https://0ncore.com/api/workflows/blog-to-social/status?executionId=<uuid>
```

Returns the current status, completed steps, and results (if finished).

---

## Dashboard

Users can also trigger and monitor this workflow from the 0nCore dashboard:

```
https://0ncore.com/dashboard/workflows/blog-social
```

The dashboard provides:
- Manual topic input with tone/platform/segment selection
- Live progress indicators for each step
- Blog post preview
- Social post previews with posted/failed status
- Email campaign stats
- Full execution history
