import { NextRequest, NextResponse } from 'next/server'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { description, tone = 'professional', industry = 'general' } = await req.json()

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
    }

    const systemPrompt = `You are an expert email designer. Generate responsive, email-safe HTML using table-based layouts with inline styles.
The email must be:
- Fully responsive with table layout (no div-based layouts)
- All styles inline (no <style> tags or external CSS)
- Email-client safe (works in Gmail, Outlook, Apple Mail)
- Include a meta viewport tag for mobile
- Include a company logo placeholder (use a placeholder div with text "LOGO")
- Include a clear CTA button with proper styling (padding, background color, border-radius)
- Include an unsubscribe footer
- Use a clean, modern design
- Max width 600px centered

Tone: ${tone}
Industry: ${industry}

Also generate an Unlayer-compatible JSON design object. The design should have this structure:
{
  "body": {
    "rows": [...],
    "values": {
      "backgroundColor": "#f5f5f5",
      "width": 600,
      "fontFamily": { "label": "Arial", "value": "arial,helvetica,sans-serif" }
    }
  }
}

Each row should have columns with content items (text, image, button, divider, html).

Return your response as valid JSON with this exact structure:
{
  "html": "<full email HTML string>",
  "subject": "subject line",
  "preheader": "preheader text",
  "design": { unlayer design JSON }
}`

    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate an email for: ${description}` },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq API error:', err)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'No content generated' }, { status: 500 })
    }

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({
        html: parsed.html || '',
        subject: parsed.subject || '',
        preheader: parsed.preheader || '',
        design: parsed.design || null,
      })
    } catch {
      // If JSON parse fails, try to extract HTML
      return NextResponse.json({
        html: content,
        subject: '',
        preheader: '',
        design: null,
      })
    }
  } catch (err) {
    console.error('Email generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
