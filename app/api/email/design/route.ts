import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { tool, input } = await req.json()

    if (!tool || !input) {
      return NextResponse.json({ error: 'Tool and input are required' }, { status: 400 })
    }

    switch (tool) {
      case 'canva':
        return NextResponse.json({
          message: `To generate header images, the Canva MCP connection handles this through Claude Code. Use the command: mcp__claude_ai_Canva__generate_design with your description "${input}". Once generated, export the image and paste the URL here, or use the AI Generate tab to describe your header image and it will be included in the generated email.`,
          tool: 'canva',
        })

      case 'figma':
        return NextResponse.json({
          message: `To import from Figma, the Figma MCP connection extracts design context via Claude Code. Use the command: mcp__claude_ai_Figma__get_design_context with the file URL "${input}". The extracted design elements can then be converted to email-safe HTML and loaded into the builder.`,
          tool: 'figma',
        })

      case 'gamma':
        return NextResponse.json({
          message: `To generate email layouts with Gamma, the Gamma MCP connection handles this through Claude Code. Use the command: mcp__claude_ai_Gamma__generate with your description "${input}". Gamma will create a polished layout that can be adapted for email. Copy the generated HTML and load it into the builder.`,
          tool: 'gamma',
        })

      default:
        return NextResponse.json({ error: `Unknown design tool: ${tool}` }, { status: 400 })
    }
  } catch (err) {
    console.error('Design API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
