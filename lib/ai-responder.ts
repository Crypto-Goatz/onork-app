import { SVC } from "./services";

interface VaultCheck {
  isC: (service: string) => boolean;
  n: number;
}

interface FlowsCheck {
  f: Array<{ on: boolean }>;
}

export function respond(text: string, vault: VaultCheck, flows: FlowsCheck): string {
  const lo = text.toLowerCase().trim();
  const conn = Object.keys(SVC).filter((k) => vault.isC(k));
  const nm = conn.map((k) => SVC[k].l);

  if (/^(hi|hey|hello|yo|sup)/.test(lo)) {
    return conn.length === 0
      ? "Hey! Welcome to 0nork. No services connected yet - tap the Vault to get started. Each service has direct links to grab your keys."
      : `Hey! ${conn.length} service${conn.length > 1 ? "s" : ""} online - ${nm.join(", ")}. Ask me to deploy, check payments, pull contacts, run AI, or build workflows.`;
  }
  if (/status|connected|online/.test(lo)) {
    const ls = Object.entries(SVC).map(([k, s]) => `${vault.isC(k) ? "+" : "-"} ${s.l}`);
    return ls.join("\n") + `\n\n${conn.length}/${Object.keys(SVC).length} connected`;
  }
  if (/deploy|ship|push|launch/.test(lo)) {
    return vault.isC("vercel") ? "Ready to deploy. Production push or preview build?" : "Vercel not connected - open Vault, tap Vercel, add your access token.";
  }
  if (/contact|lead|pipeline|crm\b/.test(lo)) {
    return vault.isC("crm") ? "CRM is live. I can pull contacts, list workflows, or test the connection." : "CRM not connected - add Client ID and Secret in the Vault.";
  }
  if (/stripe|pay|invoice|billing|subscri|refund|balance/.test(lo)) {
    return vault.isC("stripe") ? "Stripe connected. Check balance, subscriptions, customers, or invoices?" : "Stripe not connected - add your Secret Key in the Vault.";
  }
  if (/database|supabase|sql|table|query/.test(lo)) {
    return vault.isC("supabase") ? "Database online. Count rows, check mods, or run custom SQL." : "Supabase not connected - add Project URL and Service Role key.";
  }
  if (/claude|anthropic/.test(lo)) {
    return vault.isC("anthropic") ? "Claude is ready. Generate triggers, analyze data, or test a prompt." : "Add your Anthropic API key in the Vault to use Claude.";
  }
  if (/gpt|openai/.test(lo)) {
    return vault.isC("openai") ? "OpenAI connected. Generate content, images, or embeddings." : "Add your OpenAI key in the Vault.";
  }
  if (/gemini|google ai/.test(lo)) {
    return vault.isC("gemini") ? "Gemini online - up to 2M context. Ready for multimodal tasks." : "Add your Gemini API key from AI Studio in the Vault.";
  }
  if (/perplexity|search/.test(lo)) {
    return vault.isC("perplexity") ? "Perplexity ready - real-time web search with citations." : "Add your Perplexity API key in the Vault.";
  }
  if (/slack|message|channel/.test(lo)) {
    return vault.isC("slack") ? "Slack connected. Send messages, post to channels, or set up notifications." : "Add your Slack Bot Token in the Vault.";
  }
  if (/gmail|email/.test(lo) && !/outlook/.test(lo)) {
    return vault.isC("gmail") ? "Gmail ready. Compose, read inbox, or manage labels." : "Add Gmail OAuth credentials from Google Cloud Console.";
  }
  if (/outlook|microsoft.*mail/.test(lo)) {
    return vault.isC("outlook") ? "Outlook connected via Graph API. Send, read, or manage calendar." : "Add Azure AD App credentials in the Vault.";
  }
  if (/clickup|task|project/.test(lo)) {
    return vault.isC("clickup") ? "ClickUp online. Manage tasks, spaces, and track time." : "Add your ClickUp API key in the Vault.";
  }
  if (/notion|wiki|page/.test(lo)) {
    return vault.isC("notion") ? "Notion connected. Create pages, query databases, or search." : "Add your Notion integration token in the Vault.";
  }
  if (/drive|gdrive|google drive|file/.test(lo)) {
    return vault.isC("gdrive") ? "Google Drive connected. Upload, download, search, or share files." : "Add Google Drive OAuth credentials in the Vault.";
  }
  if (/whatsapp|wa\b/.test(lo)) {
    return vault.isC("whatsapp") ? "WhatsApp Business connected. Send messages or templates." : "Add your WhatsApp token and Phone ID in the Vault.";
  }
  if (/whimsical|flow.*chart|wireframe|mind.*map/.test(lo)) {
    return vault.isC("whimsical") ? "Whimsical connected. Create flowcharts, wireframes, or mind maps." : "Add your Whimsical API key in the Vault.";
  }
  if (/hubspot/.test(lo)) {
    return vault.isC("hubspot") ? "HubSpot online. Contacts, deals, companies, and marketing." : "Add your HubSpot Private App token in the Vault.";
  }
  if (/salesforce|sfdc/.test(lo)) {
    return vault.isC("salesforce") ? "Salesforce connected. Leads, opps, accounts, and reports." : "Add your Salesforce Connected App credentials in the Vault.";
  }
  if (/n8n|automat/.test(lo)) {
    return vault.isC("n8n") ? "n8n online. List or execute your automations." : "Add n8n instance URL and API key in the Vault.";
  }
  if (/github|repo|code|pr\b|pull/.test(lo)) {
    return vault.isC("github") ? "GitHub connected. Check PRs, issues, or trigger actions." : "Add a fine-grained PAT in the Vault.";
  }
  if (/mcpfed|federation|mcp/.test(lo)) {
    return vault.isC("mcpfed") ? "MCPFED live. Browse registry, publish servers, or check analytics." : "Add your Federation Key in the Vault.";
  }
  if (/workflow|flow|automat|trigger/.test(lo)) {
    return flows.f.length
      ? `${flows.f.length} workflow${flows.f.length > 1 ? "s" : ""} (${flows.f.filter((x) => x.on).length} active). Tap the workflows button to manage or build new.`
      : "No workflows yet. Open workflows to create your first automation.";
  }
  if (/help|command|what can/.test(lo)) {
    return "I understand plain English. Try:\n\n- \"Check my Stripe balance\"\n- \"Pull CRM contacts\"\n- \"Deploy to production\"\n- \"What's connected?\"\n- \"Build a workflow\"\n\nOr type / for slash commands.";
  }
  if (/vault|credential|key|connect|setup/.test(lo)) {
    return `Vault has ${vault.n}/${Object.keys(SVC).length} services. Tap the Vault to manage - every service has direct links to get your keys.`;
  }
  if (/history|log/.test(lo)) {
    return "Tap the history icon in the header to view your full activity history.";
  }

  return conn.length
    ? `Not sure what you mean, but with ${nm.slice(0, 3).join(", ")}${conn.length > 3 ? ` + ${conn.length - 3} more` : ""} connected, I can do a lot. Try /help.`
    : "I'd love to help - connect at least one service in the Vault first so I know what tools are available.";
}
