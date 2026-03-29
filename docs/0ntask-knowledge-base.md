# 0nTask AI — Knowledge Base

## What is 0nTask?

0nTask is the simplest business assistant ever built. It's a conversational AI that handles tasks, contacts, appointments, ideas, and business operations — all through natural language. No forms, no dashboards, no learning curve. Just talk.

0nTask is powered by 0nCore, which connects to 95 services and 926 API endpoints through 0nMCP — the universal AI API orchestrator.

## Core Features

### Tasks
Drop a task in any format. 0nTask saves it immediately.

Examples of how to add a task:
- "Call John tomorrow"
- "Finish the proposal by Friday"
- "Follow up with Sarah about the contract"
- "Remind me to send the invoice at 3pm"
- "Buy groceries after work"

0nTask auto-detects:
- Priority from language: "urgent", "ASAP", "when you get a chance"
- Due dates from natural language: "tomorrow", "next Tuesday", "by end of week"
- Related people: If you mention a name, it links to that contact
- Categories: Work, personal, follow-up — auto-sorted

### Contacts
Add contacts by just mentioning them. No forms needed.

Examples:
- "Add John Smith john@acme.com 555-1234"
- "New contact: Sarah Chen, CEO at TechCorp"
- "Save Mike's number: 724-555-0100"
- "I just met Lisa from Vertex at the conference"

0nTask can also:
- Extract contact info from business card photos
- Auto-create contacts when you mention new names in tasks
- Link contacts to related tasks and appointments
- Sync all contacts to your CRM automatically

### Ideas Bucket
Raw creative capture. Ideas are never lost, never over-organized.

Trigger phrases:
- "Idea: we should build a mobile app"
- "What if we offered a free trial?"
- "Note to self: check competitor pricing"
- "Thought: partner with agencies for distribution"
- "We should look into Figma integration"

Ideas stay in a flat list intentionally. After 10+ ideas, 0nTask may suggest grouping them by theme — but only if you want.

### Appointments
Schedule meetings through conversation.

Examples:
- "Meeting with Sarah tomorrow at 2pm"
- "Block 9-11am for focused work on Friday"
- "Schedule a call with the team next Monday at 10"
- "Book a demo with TechCorp for next week"

0nTask will:
- Check calendar availability
- Suggest available times if your preferred time is taken
- Send calendar invites to other participants
- Set up reminders (SMS, email, or in-app)
- Log the appointment in your CRM

### Reminders
Never forget anything. Set reminders in natural language.

Examples:
- "Remind me at 1:00 to leave for the meeting"
- "Remind me tomorrow morning to follow up with John"
- "Ping me in 30 minutes about the deployment"
- "Every Monday at 9am, remind me to check analytics"

Delivery options: SMS, email, or in-app notification. 0nTask will ask which you prefer.

## How It Works Behind the Scenes

When you add a task, contact, appointment, or idea:
1. 0nTask processes your natural language input
2. Extracts structured data (names, dates, priorities, etc.)
3. Saves to your CRM as a contact, task, calendar event, or note
4. Links related items together (tasks ↔ contacts ↔ appointments)
5. Confirms with a short, clear response

Your data is stored in the CRM — meaning it's accessible from any device, synced across your team, and connected to every automation you build.

## Connected Services

0nTask is powered by 0nMCP, which connects to 95 services including:

Payments: Stripe, Square, QuickBooks, Xero
Email: Gmail, SendGrid, Mailchimp, Postmark
Messaging: Slack, Discord, WhatsApp, Telegram, SMS
Social: Instagram, Twitter/X, LinkedIn, Facebook, TikTok
Project Management: Asana, Trello, Monday.com, Linear, Jira
Cloud: AWS, Google Cloud, Vercel, Netlify, Cloudflare
Design: Figma, Canva
E-commerce: Shopify, WooCommerce, BigCommerce
AI: OpenAI, Claude, Gemini, Groq, ElevenLabs, Deepgram
And 50+ more.

When you need something that goes beyond tasks and contacts, 0nTask can connect to any of these services on your behalf.

## Pricing

Free: Unlimited tasks, contacts, ideas, appointments. Conversational AI included.
0nCore Starter ($80/mo): Full CRM integration, email campaigns, Slack bridge, AI assistant
0nCore Pro ($180/mo): Voice AI, course generator, multi-location, API access
0nCore Agency ($380/mo): White-label, unlimited locations, custom branding, affiliate program

## Frequently Asked Questions

Q: Is 0nTask free?
A: Yes. The core task, contact, and idea management is free forever. Advanced features like email campaigns, voice AI, and multi-location support are available through 0nCore subscriptions.

Q: Where is my data stored?
A: Your data is securely stored in the CRM with AES-256 encryption. It's accessible from any device and synced in real-time.

Q: Can I share tasks with my team?
A: Yes. Team boards are available on the Starter plan and above. Share tasks, assign to team members, and track progress together.

Q: Can 0nTask send emails for me?
A: Yes. Just say "email John about the proposal" and 0nTask will draft and send it through your connected email service.

Q: Can 0nTask book appointments?
A: Yes. Say "schedule a meeting with Sarah tomorrow at 2pm" and it checks your calendar, sends an invite, and sets a reminder.

Q: How is this different from Todoist or Notion?
A: Those tools require you to learn their interface, create structures, and manually connect integrations. 0nTask works through conversation — just talk, and it organizes everything. Plus, it's connected to 95 services through 0nMCP, so your tasks can trigger real business actions.

Q: Can I use voice instead of typing?
A: Yes. 0nTask supports voice input on all channels. On the Pro plan, Voice AI can handle phone calls, book appointments, and manage tasks by voice.

## About 0nCore

0nCore is the AI-powered CRM by RocketOpp LLC. It replaces 15+ SaaS tools with one platform:
- CRM with 245 tools across 12 modules
- AI assistant (0nTask AI)
- Automation builder with .0n SWITCH files
- Voice AI agent
- AI course generator
- Slack integration (11 commands)
- Domain management
- White-label for agencies

Website: https://0ncore.com
npm: npx 0nmcp@latest
GitHub: https://github.com/0nork/0nMCP

## About 0nMCP

0nMCP is the universal AI API orchestrator — 95 services, 926 endpoints, one npm install. It works with Claude, Gemini, Grok, Cursor, Windsurf, and every MCP-compatible AI platform. Open source (MIT license). Patent-pending security (AES-256-GCM vault encryption with hardware fingerprint binding).

Website: https://0nmcp.com
npm: https://npmjs.com/package/0nmcp
