export const IDEAS: Record<string, string[]> = {
  "crm+stripe": [
    "When Stripe payment received -> auto-create CRM contact",
    "Subscription cancelled -> trigger win-back email in CRM",
    "CRM deal closed -> generate Stripe invoice",
  ],
  "crm+anthropic": [
    "New contact -> Claude scores lead quality",
    "Auto-draft personalized follow-ups with AI",
    "Classify form submissions by intent via Claude",
  ],
  "stripe+anthropic": [
    "Dispute opened -> AI drafts response from transaction data",
    "Monthly Stripe revenue -> AI summary report",
  ],
  "github+vercel": [
    "PR opened -> auto preview deploy",
    "Release published -> production deploy",
  ],
  "slack+crm": [
    "New CRM contact -> Slack notification in #sales",
    "Deal stage change -> alert team channel",
  ],
  "gmail+crm": [
    "Email from unknown sender -> create CRM contact",
    "CRM task due -> send Gmail reminder",
  ],
  "hubspot+stripe": [
    "HubSpot deal won -> create Stripe subscription",
    "Stripe churn -> update HubSpot lifecycle stage",
  ],
  "notion+slack": [
    "Notion page updated -> Slack notification",
    "Slack message saved -> create Notion page",
  ],
  "clickup+github": [
    "GitHub issue -> ClickUp task",
    "ClickUp task done -> close GitHub issue",
  ],
  "salesforce+anthropic": [
    "New Salesforce lead -> AI qualification score",
    "Opportunity notes -> AI-generated next steps",
  ],
  "whatsapp+crm": [
    "WhatsApp message -> create/update CRM contact",
    "CRM appointment booked -> WhatsApp confirmation",
  ],
  "gdrive+notion": [
    "New Google Drive file -> Notion database entry",
    "Notion export -> save to Google Drive",
  ],
  "perplexity+slack": [
    "Slack question -> Perplexity search -> reply in thread",
  ],
  "gemini+crm": [
    "New contact -> Gemini analyzes company website",
    "Gemini generates personalized outreach",
  ],
  _base: [
    "Connect services to unlock smart workflow ideas",
    "Each connection adds triggers, actions, and AI combos",
    "Try Stripe + CRM for payment-to-contact automation",
  ],
};

export function getIdeas(connectedServices: string[]): string[] {
  const results: string[] = [];

  for (const key of Object.keys(IDEAS)) {
    if (key === "_base") continue;
    const parts = key.split("+");
    if (parts.every((x) => connectedServices.includes(x))) {
      results.push(...IDEAS[key]);
    }
  }

  if (results.length < 3) {
    results.push(...IDEAS._base);
  }

  return results;
}
