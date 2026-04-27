# Build With 0n — Guide 1: WordPress AI Site Manager

> Real product. Built live. 43 MCP tools. Full site control from a chatbot in wp-admin. Here's exactly how we built it — and how you can build the same thing.

---

## Part 1: What We Built

A WordPress plugin that turns wp-admin into a conversational AI interface. You type commands in plain English and the plugin executes them against your WordPress site.

**The finished product:**
- 43 MCP tools covering every major WordPress function
- Posts, pages, users, plugins, themes, media, WooCommerce, SEO, maintenance
- Single token authentication (0n_ token from your 0nCore account)
- Registers your site as a connected service — controllable from any device
- Works from Claude Code, Chrome extension, Slack, ChatGPT, Gemini, or your phone

**Key stats:**
- Build time: ~2 hours from zero to working plugin
- Lines of code: 1,643 (includes/mcp-tools.php) + 539 (0n-mcp.php main file)
- Tools: 43 total (12 core + 31 extended)
- WooCommerce tools: only register when WC is active (no clutter)

---

## Part 2: Why It Matters

WordPress powers 43% of the internet. Every one of those sites has an admin panel that requires clicking through menus, filling forms, switching tabs.

What if you could just say what you want?

"Create a blog post about our summer sale and schedule it for Tuesday."
"Install Yoast SEO, activate it, and update the homepage meta description."
"Show me all products under $50 that are out of stock."

That's what this plugin does. And because it connects through 0nMCP, the same command works whether you're in your terminal, your browser, Slack, or on your phone.

**Who needs this:**
- Agencies managing 10+ WordPress sites
- Business owners who aren't technical
- Developers who want to script WordPress without learning the REST API
- Anyone who's ever thought "I just want to tell my website what to do"

---

## Part 3: The Build — Step by Step

### Path A: Build with 0nMCP (Developer Route)

**Prerequisites:**
- 0nMCP installed: `npx 0nmcp`
- A WordPress site (local or live)
- A 0nCore account (0ncore.com/signup)

**Step 1: Scaffold the plugin**

In Claude Code or any MCP-connected AI, type:

```
Create a WordPress plugin called "0n for WordPress" that:
- Registers REST API endpoints at /wp-json/0n/v1/mcp
- Accepts a Bearer token for authentication
- Exposes tools for managing posts, pages, users, plugins, themes, and media
- Has a settings page where the user pastes their 0n_ token
- Validates the token against https://0ncore.com/api/auth/verify-token
```

0nMCP routes this through the AI, which generates the complete plugin. You get:
- `0n-mcp.php` — main plugin file with settings page, REST API registration, admin UI
- `includes/mcp-tools.php` — all 43 tool handlers

**Step 2: Add the tool handlers**

Each tool follows the same pattern:

```php
case 'wp_create_post':
    $result = wp_insert_post([
        'post_title'   => sanitize_text_field($input['title']),
        'post_content' => wp_kses_post($input['content']),
        'post_status'  => sanitize_text_field($input['status'] ?? 'draft'),
        'post_type'    => sanitize_text_field($input['type'] ?? 'post'),
    ]);
    return is_wp_error($result) 
        ? ['error' => $result->get_error_message()] 
        : ['post_id' => $result, 'edit_url' => get_edit_post_link($result, 'raw')];
```

Tell 0nMCP: "Add tools for: list posts, get post, update post, delete post, create user, list users, install plugin, list plugins, switch theme, upload media, get/set options, create taxonomy terms, manage comments, manage menus, site health check, maintenance mode toggle, and WooCommerce orders/products if WC is active."

It generates all 43 handlers.

**Step 3: Add site registration**

When the user connects their token, the plugin registers itself with 0nCore:

```
Tell 0nMCP: "When the user saves their token, POST to https://0ncore.com/api/services/register with the site URL, MCP endpoint URL, and list of available tools."
```

Now the site appears in the user's 0nCore dashboard at /dashboard/wordpress.

**Step 4: Add the admin UI**

```
Tell 0nMCP: "Create a WordPress settings page at Settings → 0n Core with a dark theme (#0d1117 background, #6EE05A accent). Show a token input field, connection status, registered tools grid, and a disconnect button."
```

**Step 5: Install and test**

Upload to wp-content/plugins, activate, paste your token. Type commands.

### Path B: Build with 0ncore.com (No-Code Route)

**Step 1: Sign up at 0ncore.com**

Get your 0n_ token from Settings.

**Step 2: Go to /dashboard/wordpress**

This page lists your connected WordPress sites and lets you execute tools remotely.

**Step 3: Download the pre-built plugin**

From 0ncore.com/downloads → WordPress Plugin → Download. Or from GitHub: github.com/0nork/0ncore-wordpress

**Step 4: Install on your site**

Upload the zip via Plugins → Add New → Upload. Activate. Go to Settings → 0n Core. Paste your token.

**Step 5: Control from anywhere**

Your site is now connected. Use the dashboard, Chrome extension, Slack bot, or any 0n surface to manage it.

**Same result. Zero code written.**

---

## Part 4: The Productization

### Pricing (if selling as a standalone service)

| Tier | Price | What's Included |
|------|-------|----------------|
| Free | $0 | 12 core tools (posts, pages, users, options, media, site info) |
| Pro | $29/mo | All 43 tools + WooCommerce + SEO + maintenance |
| Agency | $99/mo | Unlimited sites + bulk management dashboard |
| Enterprise | $199/mo | White-label + custom tool development |

### .0n App Schema

```json
{
  "0n_version": "1.0",
  "app": {
    "name": "WordPress AI Manager",
    "slug": "wordpress-ai-manager",
    "version": "1.0.0",
    "description": "Control any WordPress site with plain English. 43 tools.",
    "author": "RocketOpp LLC",
    "icon": "globe",
    "category": "wordpress"
  },
  "requirements": {
    "min_plan": "starter",
    "services": ["wordpress"]
  },
  "workflow": {
    "trigger": { "type": "manual", "event": "user_command" },
    "steps": [
      {
        "id": "parse",
        "type": "ai_execute",
        "config": { "prompt": "Parse this WordPress command and determine which MCP tool to call: {{trigger.command}}" }
      },
      {
        "id": "execute",
        "type": "wordpress",
        "config": { "tool": "{{steps.parse.output.tool}}", "input": "{{steps.parse.output.input}}" }
      }
    ]
  }
}
```

### Sales Page Outline
1. Hero: "Stop clicking. Start talking." + demo GIF of typing commands
2. Problem: "You spend 2 hours/day in wp-admin menus"
3. Solution: "43 tools. One chatbot. Plain English."
4. How it works: 3-step install (signup → install → paste token)
5. Tool showcase: grid of all 43 tools with descriptions
6. Pricing table
7. CTA: "Install Free — 0ncore.com/downloads"

---

## Part 5: Edge Cases & Gotchas

1. **WooCommerce tools must conditionally register** — If WC isn't active and you register WC tools, WordPress throws errors. Check `class_exists('WooCommerce')` before registering.

2. **Token validation must be constant-time** — Use `hash_equals()` not `===` for token comparison to prevent timing attacks.

3. **Media upload from URL needs error handling** — External URLs can timeout, return 404, or be too large. Set a 30-second timeout and 10MB limit.

4. **Plugin install requires filesystem access** — Some hosts block `WP_Filesystem`. Fallback to manual download instructions.

5. **Settings page must escape all output** — Every value displayed on the admin page must go through `esc_html()` or `esc_attr()`.

6. **Uninstall must clean up** — On deactivation, call the unregister API and delete the stored token from wp_options.

---

## Part 6: Build Checklist

1. ☐ Create plugin main file (0n-mcp.php) with plugin header
2. ☐ Add settings page with token input + connection UI
3. ☐ Register REST API namespace at /wp-json/0n/v1/
4. ☐ Implement token verification against 0ncore.com/api/auth/verify-token
5. ☐ Build 12 core MCP tools (posts, pages, users, options, plugins, media, site info)
6. ☐ Build 19 extended tools (themes, taxonomies, comments, menus, search, SEO, maintenance)
7. ☐ Build 12 WooCommerce tools (conditional on WC active)
8. ☐ Add site registration on token save (POST to /api/services/register)
9. ☐ Add site unregistration on disconnect/deactivation
10. ☐ Add admin dashboard widget showing connection status
11. ☐ Test all 43 tools against a live WordPress site
12. ☐ Package as zip for distribution
13. ☐ Create .0n marketplace app listing
14. ☐ Write README with install instructions

---

## Part 7: Course Outline — "Build an AI WordPress Manager in One Session"

**Lesson 1: The Vision (10 min)**
What we're building. Why conversational WordPress management matters. Demo of the finished product.

**Lesson 2: Setting Up 0nMCP (15 min)**
Create account. Get token. Install 0nMCP. Connect to Claude Code. Your first command.

**Lesson 3: Plugin Architecture (20 min)**
How WordPress plugins work. REST API basics. The MCP tool pattern. Token authentication.

**Lesson 4: Building the Core Tools (30 min)**
Posts, pages, users, options. Each tool: what it does, the code, testing it live.

**Lesson 5: Extended Tools + WooCommerce (25 min)**
Themes, media, SEO, maintenance mode. Conditional WooCommerce registration.

**Lesson 6: The Admin UI (20 min)**
Settings page. Dark theme. Connection status. Tool grid display.

**Lesson 7: Productization (15 min)**
Pricing. Marketplace listing. .0n app format. Sales page.

**Total: ~2.5 hours of content → user has a working plugin + marketplace listing**

---

## Part 8: Why This Sells

Every WordPress user clicks through the same menus hundreds of times a week. This plugin eliminates that entirely.

The positioning: "Your website now understands English."

The cross-sell: once they install the WordPress plugin, they see it's connected through 0nMCP. They discover they can also connect Stripe, Slack, their CRM, LinkedIn, and 90 other services through the same token. One plugin becomes the gateway to the entire platform.

**Revenue projection:**
- 1,000 free users → 10% convert to Pro ($29/mo) = $2,900 MRR
- 50 agencies at $99/mo = $4,950 MRR
- Total: ~$8K MRR = ~$96K ARR from one plugin

But the real value is the gateway effect. Every WordPress user who installs this becomes an 0nCore user.

---

*Built with 0n. Documented for everyone. The platform IS the proof.*
*0ncore.com | npm: 0nmcp | github.com/0nork/0nMCP*
