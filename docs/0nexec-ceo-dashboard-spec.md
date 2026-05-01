# 0nExec — CEO Command Dashboard

> The 10,000 foot view. Every department. Every process. Every ticking clock. The CEO sees ONE screen and knows exactly where their attention is needed.

> For Claude Code. Build this as a standalone module in onork-app AND as a tab in the Chrome extension.

---

## THE CONCEPT

A company is a pipeline. Each stage is a department. Each card is an item with a clock on it.

The CEO doesn't need dashboards full of charts. They need to know ONE thing: **what's late?**

0nExec answers that by turning every business process into a time-tracked card that rises in urgency as deadlines approach. Green (on track) → yellow (watch it) → red (act now). The CEO's eyes go to the red. Always.

**Not a pipeline view. An urgency view.**

---

## THE VISUAL MODEL

```
┌─────────────────────────────────────────────────────────────────────┐
│                         0nExec — Company Pulse                       │
│  ████ 3 critical   ███ 7 warning   ███ 28 on track    Updated: now  │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│  SALES   │ ONBOARD  │ SERVICE  │ BILLING  │ MAINT    │ MARKETING    │
│  7d avg  │  5d avg  │  2d avg  │  3d avg  │  14d avg │  30d cycle   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│          │          │          │          │          │              │
│ ████████ │          │ ████████ │          │          │              │
│ Day 15   │          │ Day 6    │          │          │              │
│ Acme Corp│          │ MedTech  │          │          │              │
│ CRITICAL │          │ CRITICAL │          │          │              │
│          │          │          │          │          │              │
│ ███████  │ ███████  │          │ ███████  │          │              │
│ Day 9    │ Day 8    │          │ Day 5    │          │              │
│ TechFlow │ BrightCo │          │ Acme     │          │              │
│ WARNING  │ WARNING  │          │ WARNING  │          │              │
│          │          │          │          │          │              │
│ ██       │ ██       │ ██       │ ██       │ ██       │ ██           │
│ Day 3    │ Day 2    │ Day 1    │ Day 1    │ Day 5    │ Day 12       │
│ NewCo    │ FastShip │ ClinicX  │ NewCo    │ Suite A  │ Q2 Campaign  │
│ ON TRACK │ ON TRACK │ ON TRACK │ ON TRACK │ ON TRACK │ ON TRACK     │
│          │          │          │          │          │              │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘
```

Cards float UP as urgency increases. RED is at the top. GREEN is at the bottom. The CEO reads top-to-bottom, left-to-right: "Acme Corp has been in Sales for 15 days (target: 7). MedTech has been in Service for 6 days (target: 2). These need my attention."

---

## DATA MODEL

### Department Configuration

Each "department" maps to a CRM pipeline stage. The CEO (or admin) configures:

```typescript
interface Department {
  id: string;
  name: string;                    // "Sales", "Onboarding", "Service"
  pipeline_id: string;             // CRM pipeline ID
  stage_id: string;                // CRM stage ID
  target_days: number;             // expected time in this stage
  warning_threshold_days: number;  // when to turn yellow (default: target * 0.8)
  critical_threshold_days: number; // when to turn red (default: target * 1.2)
  sort_order: number;              // left-to-right display order
  icon: string;                    // Lucide icon name
  color: string;                   // accent color for the column
  
  // Reward/alert rules
  fast_completion_bonus: boolean;  // if completed under target, trigger reward
  fast_completion_days: number;    // threshold for "fast" (e.g., onboarding in 2 days)
  fast_completion_action: string;  // "notify_slack" | "add_tag" | "create_task" | "bonus_note"
  
  overdue_action: string;         // "notify_ceo" | "escalate" | "reassign" | "alert_slack"
  overdue_notify_every_hours: number; // re-alert interval for overdue items
}
```

### Card (Opportunity/Contact in a Stage)

Each card represents something moving through the pipeline:

```typescript
interface ExecCard {
  id: string;
  opportunity_id: string;         // CRM opportunity ID
  contact_id: string;             // CRM contact ID
  contact_name: string;
  company_name: string;
  assigned_to: string;            // team member responsible
  
  department_id: string;          // which department this is in
  entered_stage_at: Date;         // when it entered this stage
  days_in_stage: number;          // calculated: now - entered_stage_at
  
  urgency: 'on_track' | 'watch' | 'warning' | 'critical' | 'overdue';
  urgency_score: number;          // 0-100 (higher = more urgent)
  
  monetary_value: number;         // deal value
  last_activity: Date;            // last CRM activity (email, call, note)
  days_since_activity: number;    // staleness indicator
  
  // Computed
  target_days: number;            // from department config
  days_remaining: number;         // target - days_in_stage (negative = overdue)
  percent_through: number;        // days_in_stage / target_days * 100
}
```

### Urgency Calculation

```typescript
function calculateUrgency(card: ExecCard, dept: Department): {
  urgency: string;
  urgency_score: number;
  color: string;
} {
  const pct = card.days_in_stage / dept.target_days;
  
  if (pct >= 1.5) return { urgency: 'overdue', urgency_score: 100, color: '#f87171' };    // bright red
  if (pct >= 1.2) return { urgency: 'critical', urgency_score: 85, color: '#ef4444' };    // red
  if (pct >= 1.0) return { urgency: 'warning', urgency_score: 70, color: '#fbbf24' };     // amber
  if (pct >= 0.8) return { urgency: 'watch', urgency_score: 50, color: '#fb923c' };       // orange
  return { urgency: 'on_track', urgency_score: Math.round(pct * 40), color: '#6EE05A' };  // green
  
  // Bonus: if no activity in 48+ hours AND not on_track, boost urgency_score by 15
  // Stale deals are more dangerous than active ones
}
```

---

## DATABASE

```sql
CREATE TABLE exec_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  location_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  target_days INTEGER NOT NULL DEFAULT 7,
  warning_threshold DECIMAL(3,2) DEFAULT 0.80,
  critical_threshold DECIMAL(3,2) DEFAULT 1.20,
  sort_order INTEGER DEFAULT 0,
  icon TEXT DEFAULT 'briefcase',
  color TEXT DEFAULT '#6EE05A',
  fast_completion_enabled BOOLEAN DEFAULT false,
  fast_completion_days INTEGER,
  fast_completion_action TEXT DEFAULT 'notify_slack',
  overdue_action TEXT DEFAULT 'notify_ceo',
  overdue_notify_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exec_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  departments JSONB NOT NULL,
  total_cards INTEGER,
  critical_count INTEGER,
  warning_count INTEGER,
  on_track_count INTEGER,
  avg_days_per_department JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, snapshot_date)
);

CREATE TABLE exec_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  card_id TEXT,
  department_id UUID REFERENCES exec_departments(id),
  alert_type TEXT CHECK (alert_type IN ('overdue', 'critical', 'fast_completion', 'stale', 'reassigned')),
  message TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exec_dept ON exec_departments(location_id, is_active, sort_order);
CREATE INDEX idx_exec_snap ON exec_snapshots(location_id, snapshot_date DESC);
CREATE INDEX idx_exec_alerts ON exec_alerts(location_id, acknowledged, created_at DESC);
```

---

## API

### `app/api/exec/departments/route.ts`
```
GET — list departments for this user/location
POST — create a new department (maps to pipeline stage)
PATCH — update department config
DELETE — deactivate a department
```

### `app/api/exec/dashboard/route.ts`
```
GET — the main CEO view
Returns: all departments with their cards, sorted by urgency
Each card has: contact name, company, days in stage, urgency level, color, value, assigned to, last activity

Flow:
1. Get all active departments for this location
2. For each department, query CRM: GET /opportunities/?pipelineId=X&stageId=Y
3. For each opportunity, calculate days_in_stage and urgency
4. Sort cards within each department by urgency_score DESC (most urgent at top)
5. Return the full dashboard state
```

### `app/api/exec/alerts/route.ts`
```
GET — list unacknowledged alerts
POST — acknowledge an alert
```

### `app/api/exec/act/route.ts`
```
POST — CEO takes action on a card
Actions:
  - reassign: move to different team member
  - escalate: add "escalated" tag + notify assigned person
  - note: add a CEO note to the opportunity
  - move: move to next stage
  - call: log a call activity
  - email: send an email to the contact
  - snooze: suppress alerts for X hours
```

### `app/api/cron/exec-check/route.ts`
```
Runs every hour
For each active department across all locations:
  - Query CRM for opportunities in that stage
  - Calculate urgency for each
  - If any are critical/overdue and haven't been alerted recently → create exec_alert
  - If any completed fast → create fast_completion alert
  - Take daily snapshot at midnight → exec_snapshots
```

---

## DASHBOARD PAGE: `app/dashboard/exec/page.tsx`

### Header bar
```
┌─────────────────────────────────────────────────────┐
│ 0nExec — Company Pulse                    [⟳ Refresh] │
│ ████ 3 critical  ███ 7 warning  ███ 28 on track     │
│ Updated: 2 minutes ago                               │
└─────────────────────────────────────────────────────┘
```

Three badge counts at the top: critical (red), warning (amber), on track (green). Always visible. One glance tells you if the company is healthy.

### Department columns

Horizontal scrollable row of department columns. Each column:

```
┌─────────────┐
│ 📊 SALES    │
│ Target: 7d  │
│ Avg: 5.2d   │
│ Items: 12   │
├─────────────┤
│             │
│ Card stack  │
│ (sorted by  │
│  urgency)   │
│             │
└─────────────┘
```

### Card design

Each card in a department column:

```css
.exec-card {
  background: var(--bg-card);
  border-left: 4px solid; /* color based on urgency */
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.exec-card.critical { border-left-color: #ef4444; background: rgba(239,68,68,0.08); }
.exec-card.warning { border-left-color: #fbbf24; background: rgba(251,191,36,0.06); }
.exec-card.watch { border-left-color: #fb923c; }
.exec-card.on-track { border-left-color: #6EE05A; }
.exec-card.overdue { border-left-color: #f87171; animation: pulse-red 2s infinite; }

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.3); }
  50% { box-shadow: 0 0 8px 2px rgba(248,113,113,0.15); }
}
```

Card content:
```
┌──────────────────────────┐
│ Acme Corp          Day 15│
│ John Doe · $12,000       │
│ ████████████████░░░ 214% │
│ Last activity: 3d ago ⚠️ │
│ Assigned: Sarah C.       │
└──────────────────────────┘
```

- Company name (bold) + days in stage (right-aligned, color-coded)
- Contact name + deal value
- Progress bar: green up to 100%, amber to 120%, red past 120%
- Last activity with staleness warning if >48h
- Assigned team member

### Card click → action drawer

When CEO clicks a card, a side drawer opens with:

```
┌──────────────────────────────────────┐
│ Acme Corp — Day 15 in Sales          │
│ ████████████████████ 214% of target  │
├──────────────────────────────────────┤
│ Contact: John Doe                    │
│ Email: john@acme.com                 │
│ Phone: +1 555-0123                   │
│ Value: $12,000                       │
│ Assigned: Sarah C.                   │
│ Entered stage: Apr 13, 2026          │
│ Last activity: Apr 25 (3 days ago)   │
├──────────────────────────────────────┤
│ Recent activity:                     │
│ Apr 25 — Email sent (proposal)       │
│ Apr 22 — Call (15 min)               │
│ Apr 18 — Note: "Interested in Pro"   │
├──────────────────────────────────────┤
│ CEO ACTIONS:                         │
│                                      │
│ [📞 Call Now]  [✉️ Send Email]       │
│ [📝 Add Note]  [👤 Reassign]        │
│ [⬆️ Escalate]  [➡️ Move Stage]      │
│ [⏰ Snooze 24h] [🔕 Dismiss]        │
└──────────────────────────────────────┘
```

Every action calls the CRM API through the proxy. The CEO can act without leaving 0nExec.

### Department configuration

Settings page or modal for each department:

```
Department: Sales
Pipeline: [Sales Pipeline ▼]
Stage: [New Lead ▼]
Target days: [7]
Warning at: [80%] of target (5.6 days)
Critical at: [120%] of target (8.4 days)

Fast completion:
  ☑ Enabled
  If completed in under [3] days:
  Action: [Send Slack notification ▼]

Overdue:
  Action: [Notify CEO ▼]
  Re-alert every: [24] hours
```

---

## CHROME EXTENSION TAB: EXEC

Add "Exec" as the 6th tab in the extension (between Flows and Settings). This is the compact mobile version of the CEO dashboard.

### Extension layout

```
┌──────────────────────────────────────┐
│ COMPANY PULSE                        │
│ ██ 3 critical  ██ 7 warning  ██ 28  │
├──────────────────────────────────────┤
│                                      │
│ CRITICAL ITEMS (show these first)    │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │🔴 SALES · Day 15                │ │
│ │   Acme Corp · $12K              │ │
│ │   Sarah C. · No activity 3d    │ │
│ │   [Call] [Note] [Escalate]      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │🔴 SERVICE · Day 6               │ │
│ │   MedTech · Ticket #1247       │ │
│ │   Mike T. · Active today       │ │
│ │   [View] [Reassign] [Escalate]  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ WARNING ITEMS                        │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │🟡 ONBOARD · Day 8               │ │
│ │   BrightCo · Setup pending     │ │
│ │   Alex R. · Last: yesterday    │ │
│ │   [Check In] [Note]             │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ON TRACK (collapsed by default)      │
│ ▶ 28 items on track across 6 depts  │
│                                      │
├──────────────────────────────────────┤
│ DEPARTMENT HEALTH                    │
│ Sales: 5.2d avg (target 7d) ✅      │
│ Onboard: 4.1d avg (target 5d) ✅    │
│ Service: 3.8d avg (target 2d) ⚠️    │
│ Billing: 1.2d avg (target 3d) ✅    │
└──────────────────────────────────────┘
```

In the extension, the view is LIST-BASED (not columns) because the sidebar is too narrow for a kanban view. Items are grouped by urgency level (critical first, then warning, then on track collapsed). Each card has inline action buttons.

### Department health summary

At the bottom, a compact health check per department:
- Department name + average days + target + status emoji
- Green check if avg < target
- Warning if avg > target but < critical
- Red X if avg > critical

---

## ALERT SYSTEM

### Slack notifications (if configured)

**Overdue alert:**
```
🔴 OVERDUE: Acme Corp has been in Sales for 15 days (target: 7)
Assigned to: Sarah C.
Last activity: 3 days ago
Value: $12,000

[View in 0nExec] [Call Contact] [Reassign]
```

**Fast completion alert:**
```
🏆 FAST: BrightCo completed Onboarding in 2 days (target: 5)
Handled by: Alex R.
Consider: bonus, recognition, or template their process

[View Details]
```

**Daily digest (sent at 8am):**
```
📊 0nExec Daily Digest — Apr 28, 2026

Critical: 3 items need attention
  • Acme Corp — Sales Day 15 (Sarah C.)
  • MedTech — Service Day 6 (Mike T.)
  • DataFlow — Billing Day 5 (unassigned!)

Warnings: 7 items approaching deadlines
Completed yesterday: 4 items
Fast completions: 1 (BrightCo — Onboarding in 2 days 🏆)

Company health: Sales ✅ Onboard ✅ Service ⚠️ Billing ✅
```

### CRM webhook integration

When a CRM opportunity changes stage (webhook event `OpportunityStatusUpdate`):
1. Check if the NEW stage is a department
2. Record the `entered_stage_at` timestamp
3. If the OLD stage was a department, calculate completion time
4. If completion was fast → trigger fast_completion_action
5. Update exec_snapshots

---

## THE FORMULA ENGINE (from existing 0nExec spec)

The urgency score isn't just time-based. It factors in:

```typescript
function calculateExecScore(card: ExecCard, dept: Department): number {
  let score = 0;
  
  // Time factor (50% weight)
  const timePct = card.days_in_stage / dept.target_days;
  score += Math.min(50, timePct * 35);
  
  // Staleness factor (20% weight) — no recent activity is a red flag
  const staleDays = card.days_since_activity;
  if (staleDays > 5) score += 20;
  else if (staleDays > 3) score += 15;
  else if (staleDays > 1) score += 8;
  
  // Value factor (15% weight) — high-value deals get more attention
  if (card.monetary_value > 10000) score += 15;
  else if (card.monetary_value > 5000) score += 10;
  else if (card.monetary_value > 1000) score += 5;
  
  // Assignment factor (10% weight) — unassigned items are more urgent
  if (!card.assigned_to) score += 10;
  
  // Trend factor (5% weight) — getting worse vs improving
  // Compare current urgency to 24h ago
  
  return Math.min(100, score);
}
```

---

## PRICING (as a product)

| Tier | Price | Departments | Cards | Alerts |
|------|-------|-------------|-------|--------|
| Starter | $79/mo | 3 | 50 | Email only |
| Pro | $199/mo | 8 | 200 | Slack + email + daily digest |
| Enterprise | $499/mo | Unlimited | Unlimited | All + API access + custom webhooks |

---

## BUILD ORDER

```
1. Database tables (exec_departments, exec_snapshots, exec_alerts)
2. Department CRUD API (/api/exec/departments/)
3. Dashboard data API (/api/exec/dashboard/) — queries CRM, calculates urgency
4. CEO action API (/api/exec/act/) — reassign, escalate, note, move, call, email, snooze
5. Dashboard page (app/dashboard/exec/page.tsx) — column view with card stacking
6. Card action drawer (click card → details + actions)
7. Department config modal
8. Hourly cron (/api/cron/exec-check/) — alerts + snapshots
9. Slack notification integration
10. Chrome extension Exec tab — list view sorted by urgency
11. CRM webhook handler — stage change detection
12. Daily digest email
```

## COMMIT

```bash
cd ~/Github/onork-app
git add -A && git commit -m "0nExec: CEO command dashboard — urgency-sorted departments, time tracking, alert system, action drawer" && git push origin main
```

---

## WHY THIS WINS

Every other business dashboard shows you what happened. Graphs. Charts. Numbers.

0nExec shows you what needs to happen. Right now. In order of urgency.

The CEO opens one screen. Eyes go to the top-left. Red cards. That's where they act. Everything else is green. The company is running.

No charts. No graphs. No scrolling through reports. Just: what's late, how late, and what do I do about it.

**The tag line: "Your company at a glance. Red means act."**

---

*0nExec — the CEO dashboard that earns its screen time.*
*0ncore.com | Built by RocketOpp LLC*
