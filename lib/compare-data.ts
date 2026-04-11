export interface Feature {
  text: string;
  has: boolean;
}

export interface ColumnData {
  name: string;
  price: string;
  features: Feature[];
}

export interface ComparisonEntry {
  kicker: string;
  headline: string;
  subheadline: string;
  current: ColumnData;
  crm: ColumnData;
  full: ColumnData;
}

export const COMPARISON_DATA: Record<string, ComparisonEntry> = {
  "no-crm": {
    kicker: "No CRM Detected",
    headline: "You're Running a Business Without a System",
    subheadline:
      "Every day without a CRM, leads slip through the cracks. No follow-ups, no pipeline, no automation. Let's fix that.",
    current: {
      name: "No CRM",
      price: "$0/mo + lost leads",
      features: [
        { text: "Contact Management", has: false },
        { text: "Email Marketing", has: false },
        { text: "SMS & Phone", has: false },
        { text: "Booking & Calendar", has: false },
        { text: "Sales Pipeline", has: false },
        { text: "Inbox", has: true },
        { text: "Reviews & Reputation", has: false },
        { text: "AI Automations", has: false },
        { text: "Invoicing & Payments", has: false },
        { text: "Website & Funnels", has: false },
      ],
    },
    crm: {
      name: "Rocket+ CRM",
      price: "$297/mo",
      features: [
        { text: "Contact Management", has: true },
        { text: "Email Marketing", has: true },
        { text: "SMS & Phone", has: true },
        { text: "Booking & Calendar", has: true },
        { text: "Sales Pipeline", has: true },
        { text: "Unified Inbox", has: true },
        { text: "Reviews & Reputation", has: true },
        { text: "Basic Automations", has: true },
        { text: "Invoicing & Payments", has: true },
        { text: "Website & Funnels", has: true },
      ],
    },
    full: {
      name: "Rocket+ + 0nMCP",
      price: "$297 + $29/mo",
      features: [
        { text: "Everything in Rocket+", has: true },
        { text: "AI-Powered Automations", has: true },
        { text: "800+ Tool Integrations", has: true },
        { text: "AI Voice Agents", has: true },
        { text: "Workflow Builder", has: true },
        { text: "Multi-AI Council", has: true },
        { text: "Encrypted Vault", has: true },
        { text: "Smart Lead Scoring", has: true },
        { text: "Auto Follow-Ups", has: true },
        { text: "Real-Time Analytics", has: true },
      ],
    },
  },

  hubspot: {
    kicker: "Currently Using HubSpot",
    headline: "HubSpot Is Powerful. But It's Missing Half the Stack.",
    subheadline:
      "You're paying $800-3,200/mo for CRM, email, and booking. But where's your phone system? SMS? Review management? AI?",
    current: {
      name: "HubSpot",
      price: "$800-3,200/mo",
      features: [
        { text: "Contact Management", has: true },
        { text: "Email Marketing", has: true },
        { text: "Booking & Calendar", has: true },
        { text: "Sales Pipeline", has: true },
        { text: "Phone & SMS", has: false },
        { text: "Review Management", has: false },
        { text: "AI Automations", has: false },
        { text: "Website & Funnels", has: false },
        { text: "Invoicing & Payments", has: false },
        { text: "Unified Inbox", has: false },
      ],
    },
    crm: {
      name: "Rocket+ CRM",
      price: "$297/mo",
      features: [
        { text: "Contact Management", has: true },
        { text: "Email Marketing", has: true },
        { text: "Booking & Calendar", has: true },
        { text: "Sales Pipeline", has: true },
        { text: "Phone & SMS", has: true },
        { text: "Review Management", has: true },
        { text: "Built-In Automations", has: true },
        { text: "Website & Funnels", has: true },
        { text: "Invoicing & Payments", has: true },
        { text: "Unified Inbox", has: true },
      ],
    },
    full: {
      name: "Rocket+ + 0nMCP",
      price: "$297 + $29/mo",
      features: [
        { text: "Everything in Rocket+", has: true },
        { text: "AI-Powered Automations", has: true },
        { text: "800+ Tool Integrations", has: true },
        { text: "AI Voice Agents", has: true },
        { text: "Workflow Builder", has: true },
        { text: "Multi-AI Council", has: true },
        { text: "Encrypted Vault", has: true },
        { text: "Smart Lead Scoring", has: true },
        { text: "Auto Follow-Ups", has: true },
        { text: "Real-Time Analytics", has: true },
      ],
    },
  },

  activecampaign: {
    kicker: "Currently Using ActiveCampaign",
    headline: "ActiveCampaign Does Email. Everything Else Is Extra.",
    subheadline:
      "You've got email and basic CRM at $145-400/mo. But you're missing phone, SMS, booking, reviews, and any real AI.",
    current: {
      name: "ActiveCampaign",
      price: "$145-400/mo",
      features: [
        { text: "Email Marketing", has: true },
        { text: "Basic CRM", has: true },
        { text: "Basic Automations", has: true },
        { text: "Phone & SMS", has: false },
        { text: "Booking & Calendar", has: false },
        { text: "Review Management", has: false },
        { text: "Sales Pipeline", has: false },
        { text: "Website & Funnels", has: false },
        { text: "AI Automations", has: false },
        { text: "Unified Inbox", has: false },
      ],
    },
    crm: {
      name: "Rocket+ CRM",
      price: "$297/mo",
      features: [
        { text: "Email Marketing", has: true },
        { text: "Full CRM", has: true },
        { text: "Advanced Automations", has: true },
        { text: "Phone & SMS", has: true },
        { text: "Booking & Calendar", has: true },
        { text: "Review Management", has: true },
        { text: "Sales Pipeline", has: true },
        { text: "Website & Funnels", has: true },
        { text: "Invoicing & Payments", has: true },
        { text: "Unified Inbox", has: true },
      ],
    },
    full: {
      name: "Rocket+ + 0nMCP",
      price: "$297 + $29/mo",
      features: [
        { text: "Everything in Rocket+", has: true },
        { text: "AI-Powered Automations", has: true },
        { text: "800+ Tool Integrations", has: true },
        { text: "AI Voice Agents", has: true },
        { text: "Workflow Builder", has: true },
        { text: "Multi-AI Council", has: true },
        { text: "Encrypted Vault", has: true },
        { text: "Smart Lead Scoring", has: true },
        { text: "Auto Follow-Ups", has: true },
        { text: "Real-Time Analytics", has: true },
      ],
    },
  },

  mailchimp: {
    kicker: "Currently Using Mailchimp",
    headline: "Mailchimp Sends Emails. That's About It.",
    subheadline:
      "At $35-350/mo you get email and basic automations. No CRM, no phone, no SMS, no booking, no pipeline. Time to upgrade.",
    current: {
      name: "Mailchimp",
      price: "$35-350/mo",
      features: [
        { text: "Email Marketing", has: true },
        { text: "Basic Automations", has: true },
        { text: "Contact Management", has: false },
        { text: "Phone & SMS", has: false },
        { text: "Booking & Calendar", has: false },
        { text: "Sales Pipeline", has: false },
        { text: "Review Management", has: false },
        { text: "Website & Funnels", has: false },
        { text: "AI Automations", has: false },
        { text: "Invoicing & Payments", has: false },
      ],
    },
    crm: {
      name: "Rocket+ CRM",
      price: "$297/mo",
      features: [
        { text: "Email Marketing", has: true },
        { text: "Advanced Automations", has: true },
        { text: "Contact Management", has: true },
        { text: "Phone & SMS", has: true },
        { text: "Booking & Calendar", has: true },
        { text: "Sales Pipeline", has: true },
        { text: "Review Management", has: true },
        { text: "Website & Funnels", has: true },
        { text: "Invoicing & Payments", has: true },
        { text: "Unified Inbox", has: true },
      ],
    },
    full: {
      name: "Rocket+ + 0nMCP",
      price: "$297 + $29/mo",
      features: [
        { text: "Everything in Rocket+", has: true },
        { text: "AI-Powered Automations", has: true },
        { text: "800+ Tool Integrations", has: true },
        { text: "AI Voice Agents", has: true },
        { text: "Workflow Builder", has: true },
        { text: "Multi-AI Council", has: true },
        { text: "Encrypted Vault", has: true },
        { text: "Smart Lead Scoring", has: true },
        { text: "Auto Follow-Ups", has: true },
        { text: "Real-Time Analytics", has: true },
      ],
    },
  },

  zoho: {
    kicker: "Currently Using Zoho",
    headline: "Zoho Has the Modules. They Just Don't Talk to Each Other.",
    subheadline:
      "At $50-250/mo you get CRM, email, and calendar. But constant setup, disconnected modules, and no AI layer hold you back.",
    current: {
      name: "Zoho",
      price: "$50-250/mo",
      features: [
        { text: "CRM & Contacts", has: true },
        { text: "Email Marketing", has: true },
        { text: "Calendar & Booking", has: true },
        { text: "Modules Talk to Each Other", has: false },
        { text: "Phone & SMS", has: false },
        { text: "Review Management", has: false },
        { text: "Simple Setup", has: false },
        { text: "AI Automations", has: false },
        { text: "Website & Funnels", has: false },
        { text: "Unified Inbox", has: false },
      ],
    },
    crm: {
      name: "Rocket+ CRM",
      price: "$297/mo",
      features: [
        { text: "CRM & Contacts", has: true },
        { text: "Email Marketing", has: true },
        { text: "Calendar & Booking", has: true },
        { text: "Everything Connected", has: true },
        { text: "Phone & SMS", has: true },
        { text: "Review Management", has: true },
        { text: "One-Click Setup", has: true },
        { text: "Built-In Automations", has: true },
        { text: "Website & Funnels", has: true },
        { text: "Unified Inbox", has: true },
      ],
    },
    full: {
      name: "Rocket+ + 0nMCP",
      price: "$297 + $29/mo",
      features: [
        { text: "Everything in Rocket+", has: true },
        { text: "AI-Powered Automations", has: true },
        { text: "800+ Tool Integrations", has: true },
        { text: "AI Voice Agents", has: true },
        { text: "Workflow Builder", has: true },
        { text: "Multi-AI Council", has: true },
        { text: "Encrypted Vault", has: true },
        { text: "Smart Lead Scoring", has: true },
        { text: "Auto Follow-Ups", has: true },
        { text: "Real-Time Analytics", has: true },
      ],
    },
  },

  keap: {
    kicker: "Currently Using Keap",
    headline: "Keap Costs a Fortune and Feels Like 2015.",
    subheadline:
      "At $299-599/mo you get CRM and email with a steep learning curve, outdated UI, and zero modern AI capabilities.",
    current: {
      name: "Keap",
      price: "$299-599/mo",
      features: [
        { text: "CRM & Contacts", has: true },
        { text: "Email Marketing", has: true },
        { text: "Basic Automations", has: true },
        { text: "Modern UI", has: false },
        { text: "Easy Learning Curve", has: false },
        { text: "Phone & SMS", has: false },
        { text: "Review Management", has: false },
        { text: "AI Automations", has: false },
        { text: "Website & Funnels", has: false },
        { text: "800+ Integrations", has: false },
      ],
    },
    crm: {
      name: "Rocket+ CRM",
      price: "$297/mo",
      features: [
        { text: "CRM & Contacts", has: true },
        { text: "Email Marketing", has: true },
        { text: "Advanced Automations", has: true },
        { text: "Modern UI", has: true },
        { text: "Easy Learning Curve", has: true },
        { text: "Phone & SMS", has: true },
        { text: "Review Management", has: true },
        { text: "Built-In Automations", has: true },
        { text: "Website & Funnels", has: true },
        { text: "Unified Inbox", has: true },
      ],
    },
    full: {
      name: "Rocket+ + 0nMCP",
      price: "$297 + $29/mo",
      features: [
        { text: "Everything in Rocket+", has: true },
        { text: "AI-Powered Automations", has: true },
        { text: "800+ Tool Integrations", has: true },
        { text: "AI Voice Agents", has: true },
        { text: "Workflow Builder", has: true },
        { text: "Multi-AI Council", has: true },
        { text: "Encrypted Vault", has: true },
        { text: "Smart Lead Scoring", has: true },
        { text: "Auto Follow-Ups", has: true },
        { text: "Real-Time Analytics", has: true },
      ],
    },
  },

  reviews: {
    kicker: "Using a Standalone Review Tool",
    headline: "You're Paying $200-400/mo for Reviews Alone.",
    subheadline:
      "A single-purpose review tool is expensive and disconnected. Get reviews built in alongside CRM, email, SMS, and AI.",
    current: {
      name: "Review Tool",
      price: "$200-400/mo",
      features: [
        { text: "Review Management", has: true },
        { text: "Review Requests", has: true },
        { text: "Contact Management", has: false },
        { text: "Email Marketing", has: false },
        { text: "Phone & SMS", has: false },
        { text: "Booking & Calendar", has: false },
        { text: "Sales Pipeline", has: false },
        { text: "Website & Funnels", has: false },
        { text: "AI Automations", has: false },
        { text: "Unified Inbox", has: false },
      ],
    },
    crm: {
      name: "Rocket+ CRM",
      price: "$297/mo",
      features: [
        { text: "Review Management", has: true },
        { text: "Review Requests", has: true },
        { text: "Contact Management", has: true },
        { text: "Email Marketing", has: true },
        { text: "Phone & SMS", has: true },
        { text: "Booking & Calendar", has: true },
        { text: "Sales Pipeline", has: true },
        { text: "Website & Funnels", has: true },
        { text: "Invoicing & Payments", has: true },
        { text: "Unified Inbox", has: true },
      ],
    },
    full: {
      name: "Rocket+ + 0nMCP",
      price: "$297 + $29/mo",
      features: [
        { text: "Everything in Rocket+", has: true },
        { text: "AI-Powered Automations", has: true },
        { text: "800+ Tool Integrations", has: true },
        { text: "AI Voice Agents", has: true },
        { text: "Workflow Builder", has: true },
        { text: "Multi-AI Council", has: true },
        { text: "Encrypted Vault", has: true },
        { text: "Smart Lead Scoring", has: true },
        { text: "Auto Follow-Ups", has: true },
        { text: "Real-Time Analytics", has: true },
      ],
    },
  },
};

export const VALID_SLUGS = Object.keys(COMPARISON_DATA);
