# 0nCORE Marketplace App — Master Build Plan

The full plan Mike supplied on 2026-08-03 is the source of truth for this build.
It is reproduced verbatim in the session record; the phase order, verification
checklist and non-negotiable rules there govern every commit.

Key constraints that must survive summarisation:

- **Brand rule.** Never write the platform's brand name or abbreviations in any
  code, comment, filename, variable, commit, UI string or URL. Use `crm` /
  "the CRM" / "your platform". The app's public name is **0nCORE**.
- **IP rule.** "Patent pending" only. No spec or claim language in commits.
- **Stripe rule.** `stripe-setup`, `stripe-webhook`, `stripe-worker` Edge
  Functions are READ-ONLY. Marketplace billing never touches them — app revenue
  flows through the marketplace's internal payment system.
- **Payment collection = within the platform.** This choice is IRREVERSIBLE and
  external payment pages disqualify agency reselling. Never select external,
  not even for testing.
- **Security.** All tokens server-side and encrypted at rest. RLS on with
  policies for every new table. SSO decryption server-side only — the shared
  secret never ships to the client.
- **Verify before claiming.** Every phase has checks; nothing is "done" without
  its check passing.

Phase order: registration → install/token lifecycle → SSO + iframe shell →
tile UI → billing gate + burst engine → provisioning pipeline → flow editor →
dogfood a full week → listing → public.

Open questions to resolve in discovery, NOT to assume:
- Whether adding a Billing Meter later requires a new app version.
- Whether the SaaS-mode configuration API is exposed (affects §8 step 5).
- Separate Vercel project vs route group in the existing 0ncore.com project.
