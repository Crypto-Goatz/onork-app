# 0n Ecosystem — Full Stack Audit

> Built: **2026-04-30**
> Author: Claude Code (Opus 4.7)
> Owner: Mike @ RocketOpp LLC
> Source of truth for: Supabase projects, GitHub repos, Vercel projects, table inventory.

This document is the *one* place that lists what exists, what's used, what's dead, and what's redundant across the 0n ecosystem. Update on any infrastructure change. If `STACK_AUDIT.md` says something is dead, it stays dead until this file says otherwise.

---

## TL;DR — what we have, what's a mess

- **5 Supabase projects** in the RocketOpp org. Only **1 should be canonical for everything 0n-branded**. Two of the others currently power 0n-branded apps (which is the bug Mike hit).
- **118 GitHub repos** across `Crypto-Goatz` (99) and `0nork` (19). Roughly **15 active**, **40 in slow decay**, **60+ archived candidates**.
- **50 Vercel projects** under team `cryptogoatz`. Half are abandoned v0/prototype/test deploys.
- **240+ public tables** in the canonical Supabase project — most are 0 rows. Estimated **~120 are drop candidates** (empty + no recent activity + no obvious code references).
- **Migration history**: 135 migrations from `2026-02-18` (the first day) to `2026-04-29` (yesterday). Dense activity, lots of feature scaffolding that never produced data.

---

## SECTION 1 — SUPABASE PROJECTS

| Ref | Name | Purpose | Tables | Users | Action |
|-----|------|---------|--------|-------|--------|
| `pwujhhmlrtxjmjzyttwn` | **0nMCP-Live** | The canonical 0n DB | 240+ | 43 | **KEEP — cleanup needed** |
| `yaehbwimocvvnnlojkxe` | 0nCommand | Powers `0nai.vercel.app` (0n-branded) | 90 | 7 | **MIGRATE → canonical, then archive** |
| `rtwtaisjtvdajrdyivkn` | Rocket+ Master DB | Powers `0ntask.com`, `social0n.com`, `0n-saas-template`, plus all Rocket+ family | 251 | 4 | **DECIDE — split 0n-data from Rocket+ data** |
| `txfvhoakvwndfibjvixr` | GOATZ Database | Crypto bot — NOT 0n-branded | 32 | 0 | Leave alone |
| `hpdgcgbtkgfbllumxyzq` | Fair Ice | Hockey app — NOT 0n-branded | 47 | 5 | Leave alone |

### Why this is a mess
- The redirect-loop bug Mike hit was caused by stale `sb-yaehbwimocvvnnlojkxe-auth-token` cookies from when the canonical app pointed at the wrong project at some point.
- Future 0n-branded SaaS projects must be **rejected at code review** if their Supabase URL isn't `pwujhhmlrtxjmjzyttwn`.

---

## SECTION 2 — VERCEL PROJECTS (0n-branded only)

Confirmed Supabase mapping for every Vercel project that's part of the 0n ecosystem:

| Project | Production URL | Supabase project | Status |
|---------|---------------|-----------------|--------|
| `onork-app` | 0ncore.com | ✅ pwujhhmlrtxjmjzyttwn | OK |
| `0nmcp-website` | 0nmcp.com | ✅ pwujhhmlrtxjmjzyttwn | OK |
| `0n-marketplace` | marketplace.rocketclients.com | ✅ pwujhhmlrtxjmjzyttwn | OK |
| `0nai` | 0nai.vercel.app | ❌ yaehbwimocvvnnlojkxe | **MUST REPOINT** |
| `0ntask` | 0ntask.com | ❌ rtwtaisjtvdajrdyivkn | **MUST REPOINT** |
| `social0n` | social0n.com | ❌ rtwtaisjtvdajrdyivkn | **MUST REPOINT** |
| `0n-saas-template` | 0n-saas-template.vercel.app | ❌ rtwtaisjtvdajrdyivkn | **MUST REPOINT** |
| `0n-command` | 0n-command.vercel.app | (none set) | Inactive |
| `0n-command-center` | 0n-command-center-cryptogoatz.vercel.app | (none set) | Inactive |
| `0n-ecosystem-diagram` | 0n-ecosystem-diagram.vercel.app | n/a | Static site |

### The other 40 Vercel projects (NOT 0n-branded — leave alone)
Rocket family (`rocket-mods`, `rocket-post`, `rocketopp-live`, `rocket-clients`, `rocket-internal`, `rocket-command`, `rocket-games`), `cro9`, `mcpfed`, `verifiedsxo`, `wpsxo-site`, `the-spa-ligonier`, `youth-hockey-leagues`, `fair-ice`, `nearpittsburgh*`, `ecospray-*`, `wallwork-hardscape`, `abk-unlimited*`, `xrp-predictions`, `crm-provision`, `jaxx`, `jaxengine`, `jax-2026-prediction-bot`, `in2sight`, plus 17 v0/test/prototype deploys.

---

## SECTION 3 — GITHUB REPOS

Fast scan of recency. **Active** = pushed in the last 14 days. **Stale** = pushed 14-90 days ago. **Archive candidate** = pushed 90+ days ago and has no obvious downstream.

### `0nork` org (19 repos) — the open-source / npm side

| Repo | Last push | Status | Purpose |
|------|----------|--------|---------|
| `0nMCP` | 2026-04-28 | **Active** | Universal AI orchestrator, 1,640+ tools — the npm package |
| `0n-extension` | 2026-04-30 | **Active** | Chrome extension (token-paste auth, ships to web store) |
| `0nmcp-website` | 2026-04-29 | **Active** | 0nmcp.com marketing + community |
| `0nork` | 2026-04-28 | **Active** | Parent npm meta-package |
| `0n-spec` | 2026-04-28 | **Active** | The .0n config standard |
| `crewai-mcp` | 2026-04-28 | **Active** | Standalone npm MCP server for CrewAI (just published) |
| `crewai-mcp-local` | 2026-04-28 | **Active** | Self-hosted CrewAI MCP (PyPI publish pending) |
| `0n-core-skill` | 2026-04-26 | **Active** | Universal 0n skill — 91 services |
| `0n-marketplace` | 2026-03-27 | Stale | Marketplace front-end (0n version, not Crypto-Goatz one) |
| `0n-ui` | 2026-04-22 | Stale | Shared design system |
| `0nAdmin` | 2026-03-27 | Stale | Ecosystem architecture map |
| `0n-council` | 2026-03-23 | Stale | Multi-AI council (legacy) |
| `0n-linkedin` | 2026-03-23 | Stale | LinkedIn integration spike |
| `mcp0n` | 2026-03-17 | Stale | Reddit Devvit app |
| `cr0n-engine` | 2026-03-14 | Stale | Federated learning engine |
| `rocket-client-template` | 2026-02-22 | Stale | White-label SaaS template |
| `0ndata` | 2026-02-14 | **Archive** | Dead spike |
| `demo-repository` | 2026-02-06 | **Archive** | GitHub demo, never used |
| `.github` | 2026-04-03 | n/a | Org config |

### `Crypto-Goatz` org (99 repos)

**Active 0n / RocketOpp infrastructure (~10):**
| Repo | Last push | Purpose |
|------|----------|---------|
| `onork-app` | 2026-05-01 | 0ncore.com main app — THE one we're auditing |
| `0nDefender` | 2026-04-30 | Brand protection scanner |
| `0n-dispatch` | 2026-04-28 | Single source of truth specs |
| `0ncore-wp` | 2026-04-28 | 0nCore WordPress plugin |
| `Rocket-Post` | 2026-04-27 | Rocketpost builder |
| `rocketopp-live` | 2026-04-27 | rocketopp.com |
| `spa-ligonier-wp` | 2026-04-26 | Spa client WP |
| `wpsxo-site` | 2026-04-26 | WP-SXO sales site |
| `rocket-mods` | 2026-04-26 | rocketadd.com |
| `Rocket-Command` | 2026-04-26 | Rocket AI Admin |

**0n-branded but ambiguous status:**
| Repo | Last push | Note |
|------|----------|------|
| `0ncore-wordpress` | 2026-04-26 | Newer 0ncore WP — duplicate of `0ncore-wp`? |
| `0ntask` | 2026-04-23 | 0ntask Command Center (front-end, points at Rocket+ Master DB) |
| `0n-command-center` | 2026-04-22 | Disabled |
| `0n-command` | 2026-03-06 | Older command UI — superseded by `rocket-command`? |
| `0nAI` | 2026-04-02 | Spike — superseded by Notes/brain pattern |
| `0n-saas-template` | 2026-02-19 | Reusable SaaS template |
| `0n-SVG-app` | 2026-02-25 | SVG generator spike |
| `0nprint` | 2026-02-18 | print scaling thing |
| `0nmcp-app` | 2026-02-17 | Old 0nMCP app — superseded by website |

**Dead-or-dying spikes (60+ repos, full list at the bottom of this file)**
Roughly 60 repos under Crypto-Goatz that were pushed 60+ days ago and have no production deployment. Candidates for archival.

---

## SECTION 4 — TABLES IN `pwujhhmlrtxjmjzyttwn` BY FEATURE

Tables grouped by the migration that created them. Each row is a candidate for one of:
- **LIVE** — has data + shipped UI
- **GHOST** — has data but no UI / no obvious caller
- **SCAFFOLD** — empty but recent + UI exists waiting to populate
- **DEAD** — empty + old + no caller → drop candidate

### Migration timeline (135 total)

```
2026-02-18 reddit_community, onboarding, personas
2026-02-19 converter, auth_profile_trigger
2026-02-20 seo_enhancements, fix_profiles_columns
2026-02-22 marketplace_app
2026-02-25 qa_engine, blog_cro9
2026-02-27 linkedin_core, reconcile_production
2026-02-28 fix_user_vaults, integration_requests, tracking, fix_vault_columns, persistent_user_data
2026-03-01 fix_signup_trigger, vault_files_brand, social_content_pipeline, automation_liberation_campaign,
           social_connections, extension_tokens
2026-03-02 fix_persona_profiles, email_settings, fix_signup_plan_column, fix_username_in_trigger,
           persona_content_queue
2026-03-03 oncall_brain, fix_forum_fkeys, drop_unused_tables, service_knowledge_base
2026-03-04 knowledge_unique_constraint
2026-03-05 listkit_imports
2026-03-06 ai_brain_learning, social_engine_listing, sxo_engine, sparks_credit_system, reseed_personas_forum
2026-03-07 fix_sparks_free_tier
2026-03-08 stripe_connect_marketplace, forum_content_boost, console_execution_log
2026-03-09 reddit_growth_engine
2026-03-11 marketplace_builder, brain_training, command_queue, seed_automation_content
2026-03-12 onboarding_ab_testing, web0n_projects, web0n_site_builder, web0n_coupons
2026-03-13 user_ai_providers, contributor_tier, serp_tracking
2026-03-14 tier_white_label, openrouter_provider
2026-03-15 core_ai_provider, user_crm_accounts
2026-03-16 user_labels, linkedin_ads, add0n_storefront, crm_tokens
2026-03-17 blog_engine, fix_signup_username_collision, chatgpt_oauth
2026-03-18 custom_catalog_services, crm_provision_queue, admin_todos
2026-03-19 oauth_server, profile_crm_fields, affiliate_system, verified_searches, ecosystem_users
2026-03-21 welcome_email_flag, device_auth, lessons_table, fix_username_constraint
2026-03-29 affiliate_commissions_system, affiliate_trigger_and_seed, onpress_figma_oauth, email_sequence_queue
2026-03-30 0ndefender_patent_intelligence, linkedin_certifications
2026-04-03 add_crew_agents_and_runs, mcp_registry_servers, slack_installations
2026-04-07 crm_integrations_and_agent_workflows, location_kb_branding_autoprovision,
           telegram_auth_universal_commands_permissions, chat_sessions, openai_stripe_fdw_tables,
           vip_onboarding_free_flow, campaign_builder_system
2026-04-10 tier_system_and_feature_catalog, klayer_registry_and_content_queue,
           profile_tier_enhancements, subscription_to_tier_sync_trigger
2026-04-13 exec_formula_engine
2026-04-15 user_managed_properties
2026-04-19 vsxo_init, fix_handle_new_user_search_path, vsxo_widget_usage,
           vsxo_claim_status_expand, vsxo_claim_documents, vsxo_agency_membership,
           stripe_fdw_wrappers, stripe_fdw_server, vsxo_stripe_rpcs, vsxo_admins
2026-04-24 hipaa_affiliates, upwork_radar, fiverr_radar
2026-04-27 ucp_marketplace_foundation, create_custom_triggers_table,
           create_landing_page_deployments, create_sxo_indexer_tables
2026-04-28 jaxx_operator, api_tokens_unified, jaxx_persona_fields, jaxx_commerce_toggles,
           course_builder, lead_magnet_funnel, tool_executions, user_mcp_servers,
           service_packager, portfolio_storage_bucket
2026-04-29 brain_files_foundation, notes_addon, truth_audit, canvas_workspace
```

### Domain breakdown

#### Auth & users — `LIVE`
- `profiles` (43 rows) — main user record, joined to `auth.users`. **Live, in use everywhere.**
- `api_tokens` (3 rows) — the new token system from `2026-04-28`. **Live, in use by Chrome extension.**
- `user_tokens` (4 rows) — the OLD token system. **GHOST — supersede with api_tokens, drop.**
- `crm_tokens` (0 rows) — never populated. **DEAD — drop.**
- `oauth_tokens` (19 rows) — generic OAuth provider tokens. **Live.**
- `oauth_codes` (14 rows) — OAuth code exchange. **Live.**
- `oauth_clients` (2 rows) — registered OAuth client apps. **Live.**
- `chatgpt_oauth_clients`, `chatgpt_auth_requests`, `chatgpt_refresh_tokens`, `chatgpt_tool_calls` (all 0 rows) — ChatGPT OAuth connector spike. **DEAD — drop unless we're shipping a ChatGPT integration.**
- `access_tokens` (0 rows), `device_codes` (0 rows) — device auth flow. **SCAFFOLD — empty, infrastructure exists.**
- `vip_whitelist` (4), `vip_accounts` (3), `vip_permissions` (2) — VIP gating. **Live.**

#### Brain / AI memory — `LIVE` (just shipped)
- `app_briefs` (8 rows) — system prompt per add-on. **Live, source of truth for Truth Audit.**
- `brain_files` (1 row) — per-user-per-add-on memory. **Scaffold — only Notes uses it so far.**
- `brain_outcomes` (0 rows) — outcome log per `record()` call. **Scaffold — fills as users use Notes.**
- `oncall_brain` (3 rows) — older brain table from 2026-03-03 migration. **GHOST — superseded by app_briefs+brain_files. Audit + drop.**
- `bc_brains` (0 rows) — botcoaches.com integration. **DEAD — drop or scope to a separate project.**
- `ai_brain_config` (4 rows) — admin-style key/value AI config. **Live, used by /dashboard/admin/audit.**

#### Notes — `SCAFFOLD`
- `notes` (0 rows) — yesterday's reset/rebuild. **Scaffold — Whimsical-bridged.**
- `app_config` (0 rows) — legacy ReactFlow notes blob storage. **GHOST — old data exists for some users via key=`canvas_${id}`. Migrate then drop.**

#### Canvas — `SCAFFOLD`
- `canvas_flows` (1 row) — per-user xyflow workspace. **Scaffold — just shipped.**
- `canvas_executions` (0 rows) — flow execution log. **Scaffold.**
- `canvas_templates` (1 row) — starter templates. **Live.**

#### Service Packager — `SCAFFOLD`
- `service_packages` (3 rows) — Mike's seed gig + 2 tests. **Scaffold.**
- `portfolio_items` (1 row) — public portfolio entries. **Scaffold.**

#### Marketplace / UCP / store — **DUPLICATION HERE**
- `marketplace_apps` (10 rows) + `marketplace_executions` (0) + `marketplace_installations` (0) + `marketplace_payouts` (0) + `marketplace_reviews` (0) + `marketplace_transactions` (0) + `marketplace_triggers` (0)
- `ucp_products` (12 rows) + `ucp_orders` (0)
- `add0n_listings` (5) + `add0n_purchases` (10) + `add0n_locations` (0) + `add0n_usage` (0) + `add0n_build_history` (0)
- `store_listings` (21) + `store_purchases` (28) + `store_reviews` (0)
- `listings` (2)
- **Action**: pick ONE listing model. Recommend `marketplace_apps` (10 rows, has UI). Migrate `store_listings` data into it, drop the rest.

#### Executions — **HEAVY DUPLICATION**
- `executions` (2)
- `marketplace_executions` (0)
- `tool_executions` (0)
- `console_executions` (9)
- `workflow_executions` (0)
- `command_executions` (0)
- `switch_executions` (0)
- `workflow_logs` (0)
- `crm_workflow_runs` (100)
- **Action**: pick ONE. Recommend `tool_executions` (newest, designed by Service Packager). Migrate the 9 `console_executions` rows + 100 `crm_workflow_runs` rows. Drop all the others.

#### Course Builder — `SCAFFOLD`
- `courses` (8), `lessons` (10), `enrollments` (3), `lesson_progress` (1)
- `course_drafts` (0), `course_builder_sessions` (0), `course_builder_analytics` (0)
- **Action**: keep the populated 4. Drop the 3 empty SCAFFOLDs unless used by `/api/courses/think`.

#### CRO9 SEO — `LIVE`
- `cro9_sites` (4), `cro9_tasks` (23), `cro9_action_history` (51), `cro9_adaptive_weights` (20)
- `cro9_serp_snapshots` (0), `cro9_rewrites` (0) — SCAFFOLD
- **Action**: keep all. Re-evaluate empty ones in 30 days.

#### HIPAA — `LIVE` (light)
- `hipaa_orders` (6), `hipaa_assessments` (5), `hipaa_reports` (4), `hipaa_magic_tokens` (2)
- `hipaa_sessions` (0), `hipaa_affiliates` (0), `hipaa_affiliate_clicks` (0), `hipaa_affiliate_payouts` (0) — SCAFFOLD/DEAD
- **Action**: keep populated. Drop affiliate_* if affiliate program isn't shipping in 30 days.

#### Reddit / community / personas — `LIVE` (heavy)
- `reddit_opportunities` (1058), `reddit_weights` (35), `reddit_content` (4), `reddit_engagement` (0)
- `community_threads` (173), `community_posts` (17), `community_votes` (8), `community_groups` (10), `community_personas` (15), `community_memberships` (29), `community_badges` (8), `community_user_badges` (0), `community_reactions` (0)
- `persona_conversations` (11), `persona_content_queue` (139), `persona_topic_seeds` (17)
- **Action**: live core. Drop the empty ones (`community_user_badges`, `community_reactions`, `reddit_engagement`).

#### CRM — `LIVE` (very heavy on noise)
- `crm_webhook_inbound` (**21,191 rows / 10 MB**) — every CRM webhook ever received. **Action**: archive rows older than 30 days; keep table.
- `crm_workflow_runs` (100) — actually populated.
- `crm_provision_queue` (11), `crm_installations` (2), `crm_integrations` (18), `crm_agent_workflows` (26)
- `crm_install_events` (0), `crm_oauth_sessions` (0), `crm_tokens` (0) — SCAFFOLD/DEAD

#### MCP store — `LIVE`
- `mcp_registry_cache` (1245 rows) — daily-synced from registry.modelcontextprotocol.io. **Live, cron-fed.**
- `mcp_registry_servers` (0) — older table. **DEAD.**
- `user_mcp_servers` (2 rows) — per-user MCP server connections. **Live.**

#### Switches — `SCAFFOLD`
- `switches` (0), `switch_executions` (0) — pivoted away from in favor of automations + brain. **Drop or revive.**

#### LinkedIn / VPIS — `LIVE`
- `vpis_formula_weights` (1 row), `linkedin_tool_calls` (0), `linkedin_members` (0), `linkedin_certifications` (?)
- **Action**: keep `vpis_formula_weights`. Drop empty linkedin_* tables.

#### Vault / containers — `DEAD`
- `vault_business_info`, `vault_services`, `vault_tracking`, `vault_ai_preferences`, `vault_completion`, `vault_workflows` — all 0 rows, scaffolded for vault container UI that never shipped on this DB. **DEAD — drop.**
- `user_vaults` (49), `user_vault_files` (6) — actually used. **Live.**

#### Training pipeline — `MIXED`
- `training_sources` (356) — Live (training feed)
- `training_runs` (115) — Live
- `training_pairs`, `training_datasets`, `training_evaluations`, `training_exports`, `training_rubrics`, `training_milestones`, `training_contributions`, `training_batches`, `training_plan_progress` — all 0 except none. **DEAD candidates** (most never wired).

#### vsxo_* (verifiedsxo.com) — `LIVE` separate product
- 13 vsxo_* tables, mostly populated 1-6 rows. **Action**: leave alone. They're for a different surface.

#### web0n / wpsxo — `MIXED`
- `web0n_projects` (2), `web0n_coupons` (13), `web0n_revisions` (0)
- `wpsxo_licenses` (1)
- **Action**: keep `web0n_coupons` (active product). Audit the rest.

#### Onmail / email — `DEAD`
- `onmail_inboxes` (1), `onmail_providers` (1), `onmail_campaigns` (1), `onmail_sequences` (0), `onmail_domains` (0), `onmail_campaign_contacts` (0)
- **Action**: feature was scoped but never shipped. Drop unless there's a near-term plan.

#### Jaxx (the AI assistant config) — `DEAD`
- `jaxx_rate_limits` (0), `jaxx_iky_challenges` (0), `jaxx_training_pairs` (0)
- **Action**: scaffolded for Jaxx Operator, never wired. Drop or revive when Jaxx Operator ships.

#### Affiliates — `DEAD`
- `affiliate_commissions` (0), `affiliate_payouts` (0), `affiliate_clicks` (0), `affiliate_referrals` (0)
- `hipaa_affiliates` (0), `hipaa_affiliate_clicks` (0), `hipaa_affiliate_payouts` (0)
- `service_affiliate_links` (55) — actually populated.
- **Action**: keep `service_affiliate_links`. Drop the rest until affiliate program ships.

#### Truth audit — `LIVE`
- `truth_audit` (0 rows) — populates on POST `/api/admin/truth`. **Scaffold.**

#### Operator / agents — `DEAD-leaning`
- `command_queue` (40), `universal_commands` (35) — Live (used)
- `command_addons` (8), `command_executions` (0), `agent_sessions` (0)
- **Action**: drop the 0-row ones.

---

## SECTION 5 — RECOMMENDED CONSOLIDATION PLAN

### Phase 1 — kill the cookie/cross-DB chaos (1 hour)
1. **Repoint `0nai`, `0ntask`, `social0n`, `0n-saas-template`** Vercel envs to `pwujhhmlrtxjmjzyttwn`
2. They lose access to their old data. Acceptable for low-traffic projects.
3. The `sb-yaehbwimocvvnnlojkxe-*` and `sb-rtwtaisjtvdajrdyivkn-*` cookies become irrelevant.

### Phase 2 — drop dead tables in canonical (1 hour)
Roughly **120 tables** can be dropped immediately. They have:
- 0 rows
- No incoming foreign keys
- No code references in the latest commit of `onork-app` and `0nmcp-website`

I can generate the exact `DROP TABLE` migration with safety guards once approved.

### Phase 3 — consolidate duplicates (2 hours)
- 1 listing table (kill 4 dups)
- 1 executions table (kill 6 dups)
- 1 brain table family (kill `oncall_brain`, `bc_brains`)
- 1 token table (kill `user_tokens`, `crm_tokens`)

### Phase 4 — archive dead repos (30 min)
Tag the 60+ inactive Crypto-Goatz repos as `archived: true` via `gh repo edit`. Doesn't delete them — just hides from active lists.

### Phase 5 — STACK.md governance going forward
This file lives at `/STACK_AUDIT.md`. **Any infrastructure-touching PR must update it.** No new Supabase project gets created without a one-line entry justifying it. Same for Vercel projects > 1 deployment.

---

## APPENDIX A — Full Crypto-Goatz repo list

(99 repos — too long to inline. Run `gh repo list Crypto-Goatz --limit 100` to regenerate.)

## APPENDIX B — Full Vercel project list

(50 projects — too long to inline. Run `vercel projects ls` or use the Vercel API.)

---

*End of audit. Update on every infrastructure change.*
