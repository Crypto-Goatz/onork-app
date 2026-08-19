import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY

interface TaskAction {
  type: 'create' | 'update' | 'complete'
  taskId?: string
  title?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'todo' | 'in-progress' | 'done'
  description?: string
}

export async function POST(req: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      )
    }

    const { message, tasks, context } = await req.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const taskSummary = (tasks || [])
      .map((t: any) => `- [${t.status}] "${t.title}" (priority: ${t.priority}${t.dueDate ? `, due: ${t.dueDate}` : ''})`)
      .join('\n')

    const systemPrompt = `You are the user's personal AI assistant inside 0nCore. You help manage tasks, plan their day, suggest priorities, and answer questions about their work. You have access to their task list and can suggest creating, updating, or completing tasks.

Current task list:
${taskSummary || '(no tasks yet)'}

${context ? `Additional context: ${context}` : ''}

RESPONSE FORMAT:
Always respond with valid JSON in this exact format:
{
  "reply": "Your helpful response text here (supports markdown)",
  "suggestedReplies": ["Quick reply 1", "Quick reply 2", "Quick reply 3"],
  "taskActions": []
}

The taskActions array can contain objects like:
- { "type": "create", "title": "Task name", "priority": "high", "description": "details" }
- { "type": "update", "taskId": "id", "status": "in-progress" }
- { "type": "complete", "taskId": "id" }

Only include taskActions when the user explicitly asks to create, update, or complete tasks.
Always include 2-4 suggestedReplies that are contextually relevant follow-ups.
Keep replies concise but helpful. Use markdown formatting when appropriate.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', errorText)
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 502 }
      )
    }

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({
        reply: parsed.reply || 'I couldn\'t generate a response.',
        suggestedReplies: parsed.suggestedReplies || [],
        taskActions: parsed.taskActions || [],
      })
    } catch {
      return NextResponse.json({
        reply: content,
        suggestedReplies: [],
        taskActions: [],
      })
    }
  } catch (error) {
    console.error('Task AI route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
