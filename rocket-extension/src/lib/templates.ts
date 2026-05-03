import type { CampaignTemplate } from "./storage";

export const SPA_LIGONIER_MOTHERS_DAY: CampaignTemplate = {
  id: "spa-ligonier-mothers-day",
  name: "Spa Ligonier — Mother's Day",
  description:
    "Sets up the Mother's Day campaign tags, trigger links, and custom fields for The Spa In Ligonier.",
  steps: [
    { type: "create_tag", name: "mothers-day-2026" },
    { type: "create_tag", name: "mothers-day-buyer" },
    { type: "create_tag", name: "mothers-day-giftcard" },
    { type: "create_tag", name: "mothers-day-package" },
    {
      type: "create_trigger_link",
      name: "Mother's Day Gift Card Landing",
      redirectTo: "https://spaligonier.com/mothers-day",
    },
    {
      type: "create_trigger_link",
      name: "Mother's Day Spa Package",
      redirectTo: "https://spaligonier.com/mothers-day-package",
    },
    {
      type: "create_custom_field",
      name: "Mothers Day Recipient",
      dataType: "TEXT",
    },
    {
      type: "create_custom_field",
      name: "Mothers Day Gift Amount",
      dataType: "NUMERICAL",
    },
    {
      type: "note",
      text: "After running, build the email/SMS sequence in CRM and assign it to tag 'mothers-day-2026'.",
    },
  ],
};

export const BUILT_IN_TEMPLATES: CampaignTemplate[] = [SPA_LIGONIER_MOTHERS_DAY];
