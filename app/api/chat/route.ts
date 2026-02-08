import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { message, connectedServices } = await request.json();

  // For now, use the local responder logic
  // TODO: Replace with real Anthropic API calls
  const systemPrompt = `You are 0nork, a command orchestrator AI. The user has these services connected: ${(connectedServices || []).join(", ")}.
You speak in plain, direct English - no jargon, no fluff. You help users:
- Execute actions on connected services
- Build cross-service workflows
- Troubleshoot connections
- Suggest automations based on their stack
When a service isn't connected, tell them exactly how to add it in the Vault.
Keep responses concise - 1-3 sentences for simple questions, more for complex ones.`;

  // Placeholder: return a simple response
  // Real implementation will call Anthropic API
  return NextResponse.json({
    response: `Received: "${message}". AI-powered responses coming soon. Connected: ${(connectedServices || []).length} services.`,
    systemPrompt,
  });
}
