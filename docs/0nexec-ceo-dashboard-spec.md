# 0nExec — CEO Command Dashboard (Configurable Engine)

> The 10,000 foot view. Every column. Every clock. Every rule. **Defined by the user, not by us.**

> **The principle:** We build the engine. The user builds their machine.

> For Claude Code. Build this as a standalone module in onork-app AND as a tab in the Chrome extension.

---

## THE CONCEPT

Every company is a pipeline. But no two companies share the same pipeline, the same urgency rules, or the same definition of "late."

A law firm cares about days-since-last-client-contact. A SaaS sales team cares about deal-stage age. A property manager cares about ticket-resolution time. A school cares about enrollment-pipeline conversion.

**0nExec doesn't ship with hardcoded departments.** It ships with a configuration engine. The CEO defines:

- **Columns** — what stages to track (call them anything, map to any data source)
- **Urgency formulas** — what factors matter, with what weights, at what thresholds
- **Urgency levels** — how many tiers and what to call them (`on track / warning / critical` or `green / amber / red` or `low / med / high / nuclear`)
- **Notification rules** — when to alert, who to alert, and through what channel
- **Card actions** — what buttons appear when the CEO clicks a card
- **Layouts** — saved dashboard configurations for different views (sales-only, ops-wide, exec-summary)

Result: ONE screen. The CEO's screen. Configured exactly the way they think about their business. Cards rise as urgency rises. The eyes go to the top. That's where you act.

**Not a pipeline view. An urgency view. Defined by you.**

---

## THE VISUAL MODEL

```
┌──────────────────────────────────────────────────────────────────────┐
│                       0nExec — Company Pulse                          │
│  ████ 3 critical   ███ 7 warning   ███ 28 on track     Updated: now  │
│                                              [Layout: Sales-Ops ▼]   │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┤
│ COL #1   │ COL #2   │ COL #3   │ COL #4   │ COL #5   │ COL #6        │
│ (user-   │ (user-   │ (user-   │ (user-   │ (user-   │ (user-        │
│  named)  │  named)  │  named)  │  named)  │  named)  │  named)       │
├──────────┼──────────┼──────────┼──────────┼──────────┼───────────────┤
│ ████████ │          │ ████████ │          │          │               │
│ Acme     │          │ MedTech  │          │          │               │
│ <Level3> │          │ <Level3> │          │          │               │
│          │          │          │          │          │               │
│ ███████  │ ███████  │          │ ███████  │          │               │
│ TechFlow │ BrightCo │          │ Acme     │          │               │
│ <Level2> │ <Level2> │          │ <Level2> │          │               │
│          │          │          │          │          │               │
│ ██       │ ██       │ ██       │ ██       │ ██       │ ██            │
│ NewCo    │ FastShip │ ClinicX  │ NewCo    │ Suite A  │ Q2 Campaign   │
│ <Level1> │ <Level1> │ <Level1> │ <Level1> │ <Level1> │ <Level1>      │
└──────────┴──────────┴──────────┴──────────┴──────────┴───────────────┘
```

Cards rise as urgency rises. The CEO defines what urgency means. The engine sorts and colors based on that definition.

---

## THE 8 PILLARS OF CONFIGURABILITY

| # | Pillar | What the user defines | Stored in |
|---|--------|------------------------|-----------|
| 1 | **Columns** | name, data source, query, sort order, icon, color | `exec_columns` |
| 2 | **Formulas** | named formula sets, attached to columns or global | `exec_formulas` |
| 3 | **Factors** | inputs to a formula (time, value, staleness, custom field) with weights | `exec_formula_factors` |
| 4 | **Levels** | tier names + score ranges + colors + behaviors | `exec_formula_levels` |
| 5 | **Notifications** | trigger condition + channel + frequency + recipients | `exec_notification_rules` |
| 6 | **Card Actions** | buttons that appear in the action drawer | `exec_card_actions` |
| 7 | **Layouts** | saved arrangements of columns + filters + formula assignments | `exec_layouts` |
| 8 | **Snapshots** | historical record (auto, not user-defined but exposed) | `exec_snapshots` |

---

## DATA MODEL

### 1. Columns (not "departments")

A column is a swim lane on the dashboard. The user picks the data source and the query.

```typescript
interface ExecColumn {
  id: string;
  user_id: string;
  location_id: string;
  name: string;                       // user-chosen: "Sales", "Discovery Calls", "Renewals Due"
  description?: string;
  data_source: 'crm_pipeline' | 'crm_contacts' | 'crm_opportunities' | 'crm_calendar'
             | 'crm_invoices' | 'crm_tasks' | 'webhook' | 'sql_query' | 'custom_endpoint';
  data_source_config: Record<string, any>;  // pipeline_id, stage_id, query string, etc.
  formula_id: string | null;          // which formula scores cards in this column
  sort_order: number;
  icon: string;                       // Lucide icon name
  color: string;                      // accent color
  card_template_id: string | null;    // which card template to render
  visible_when: 'always' | 'has_cards' | 'has_warning' | 'has_critical';
  is_active: boolean;
  created_at: Date;
}
```

The user can have a column called "Renewal Risk" sourced from a SQL query, or a column called "Hot Inbox" sourced from a CRM tag. Nothing is hardcoded.

### 2. Formulas (the urgency engine)

A formula is a named set of factors + levels. Formulas are reusable across columns.

```typescript
interface ExecFormula {
  id: string;
  user_id: string;
  name: string;                       // "Sales Urgency", "Service Ticket Heat", "Generic Time-Based"
  description?: string;
  is_default: boolean;                // pre-built starter formula
  factors: ExecFormulaFactor[];       // see below
  levels: ExecFormulaLevel[];         // see below
  created_at: Date;
}
```

### 3. Factors (the inputs to a formula)

Each factor takes a value off a card and contributes to the score with a weight.

```typescript
interface ExecFormulaFactor {
  id: string;
  formula_id: string;
  name: string;                       // user-chosen: "Days in stage", "Staleness", "Deal value", "VIP flag"
  factor_type: 'time_in_stage' | 'time_since_field' | 'numeric_field' | 'boolean_field'
            | 'absence_of_field' | 'custom_expression';
  field_path: string | null;          // e.g. "monetary_value", "custom.vip_status", "last_activity_at"
  weight: number;                     // 0.0 to 1.0 — relative weight in the formula
  scaling: 'linear' | 'exponential' | 'logarithmic' | 'threshold' | 'inverse';
  scaling_config: {                   // depends on scaling type
    threshold?: number;               // e.g. "if days > 5, contribute full weight"
    cap?: number;                     // max value before clamping
    multiplier?: number;
    custom_formula?: string;          // for advanced users: "Math.min(100, x * 1.5)"
  };
  enabled: boolean;
  sort_order: number;
}
```

Examples of factor configs the user can build:

- **"Days in column"** — type=time_in_stage, weight=0.5, scaling=linear, cap=30
- **"Staleness"** — type=time_since_field, field=last_activity_at, weight=0.2, scaling=exponential
- **"Deal value"** — type=numeric_field, field=monetary_value, weight=0.15, scaling=logarithmic
- **"Unassigned"** — type=absence_of_field, field=assigned_to, weight=0.1
- **"VIP flag"** — type=boolean_field, field=custom.vip, weight=0.05

The engine combines factor outputs into a single score (0-100). Weights are normalized at compute time so they always sum to 1.0.

### 4. Levels (the urgency tiers)

Levels translate a score (0-100) into a tier with a label, color, and behavior. The user defines how many levels exist and what they mean.

```typescript
interface ExecFormulaLevel {
  id: string;
  formula_id: string;
  name: string;                       // user-chosen: "On Track" / "Watch" / "Critical" / "Nuclear"
  short_label: string;                // for compact UI: "OT" / "W" / "C"
  score_min: number;                  // inclusive
  score_max: number;                  // exclusive
  color: string;                      // hex
  bg_color: string;                   // for card background tint
  icon: string;                       // Lucide name
  blink: boolean;                     // animate to draw attention
  position_priority: number;          // higher = floats to top of column
  sort_order: number;
}
```

Default starter formula ships with 4 levels: On Track (0-49) / Watch (50-69) / Warning (70-84) / Critical (85-100).

A SaaS team might switch to 5 levels. A school principal might use 3. Nothing forces them.

### 5. Notification Rules

Rule-based, condition-driven, channel-flexible.

```typescript
interface ExecNotificationRule {
  id: string;
  user_id: string;
  name: string;
  trigger: 'level_entered' | 'level_exited' | 'level_held_for' | 'fast_completion'
        | 'card_unassigned_for' | 'no_activity_for' | 'cron_digest' | 'custom_query';
  trigger_config: {
    column_ids?: string[];             // which columns this watches
    formula_id?: string;
    level_id?: string;                 // which level triggers
    duration_minutes?: number;         // for "held for" or "no activity"
    cron_schedule?: string;            // for digests: "0 8 * * *"
    custom_query?: string;             // SQL or CRM filter
  };
  channels: NotificationChannel[];
  cooldown_minutes: number;            // re-alert throttle
  message_template: string;            // {{contact.name}} has been in {{column.name}} for {{days}}d
  is_active: boolean;
}

interface NotificationChannel {
  type: 'slack' | 'email' | 'sms' | 'webhook' | 'in_app' | 'discord' | 'crm_task';
  target: string;                      // channel id, email, phone, URL
  template?: string;                   // channel-specific message override
}
```

The user can build rules like:
- *"When any card enters Critical, post to #ceo-alerts on Slack."*
- *"When a card holds Warning for >4 hours, email Sarah."*
- *"Every weekday at 8am, send digest summary to mike@."*
- *"When a card moves from Warning back to On Track, post a 🎉 to #wins."*

### 6. Card Actions

What buttons appear when the CEO clicks a card. Defined per layout or globally.

```typescript
interface ExecCardAction {
  id: string;
  user_id: string;
  name: string;                        // "Call Now", "Reassign", "Send Quote", "Mark Won"
  icon: string;
  action_type: 'crm_call' | 'crm_email' | 'crm_note' | 'crm_move_stage' | 'crm_assign'
            | 'crm_tag' | 'crm_field_update' | 'webhook' | 'workflow' | 'snooze';
  action_config: {
    template_id?: string;              // for emails/calls
    target_stage_id?: string;          // for moves
    field_path?: string;
    field_value?: any;
    webhook_url?: string;
    workflow_slug?: string;            // run a 0nMCP workflow
    snooze_hours?: number;
  };
  show_in_levels: string[];            // only show this button for cards in these levels
  show_for_columns: string[];          // restrict to specific columns
  confirm_required: boolean;
  sort_order: number;
}
```

A user can add a `Send Quote` button that runs a 0nMCP workflow that generates a PDF, posts to Slack, and logs a CRM activity — all from one click on a card.

### 7. Layouts

A layout is a saved configuration of columns + filters + formula assignments. The CEO can have multiple layouts and swap between them.

```typescript
interface ExecLayout {
  id: string;
  user_id: string;
  name: string;                        // "Sales-Only", "Ops Wide", "Renewals Watch", "Exec Summary"
  is_default: boolean;
  column_ids: string[];                // ordered
  global_filters: {
    assigned_to?: string[];
    value_min?: number;
    tags?: string[];
    date_range?: { from: Date; to: Date };
  };
  view_mode: 'columns' | 'list' | 'grid' | 'priority_stack';
  group_by: 'column' | 'urgency' | 'assignee' | 'value' | 'none';
  sort_within: 'urgency_score' | 'days_in_stage' | 'value' | 'last_activity';
  show_completed: boolean;
  refresh_interval_seconds: number;
}
```

The user can build a "Mobile Quick View" layout that's list-mode + grouped by urgency, and a "Big Screen" layout that's columns + grouped by column. Swap between them with one click.

### 8. Snapshots & Alert Log (auto)

```typescript
interface ExecSnapshot {
  id: string;
  user_id: string;
  layout_id: string;
  snapshot_at: Date;
  column_states: Record<string, ColumnState>;
  total_cards: number;
  by_level: Record<string, number>;     // dynamic — depends on user's levels
  formula_versions: Record<string, string>;
}

interface ExecAlertLog {
  id: string;
  rule_id: string;
  card_id: string;
  fired_at: Date;
  level: string;
  channels_sent: string[];
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: Date | null;
  payload: Record<string, any>;
}
```

---

## THE URGENCY ENGINE

The engine is the heart of 0nExec. It takes a card and a formula and returns a score.

```typescript
function computeUrgency(card: Card, formula: ExecFormula): UrgencyResult {
  const factorOutputs = formula.factors
    .filter(f => f.enabled)
    .map(factor => evaluateFactor(card, factor));

  const totalWeight = factorOutputs.reduce((sum, fo) => sum + fo.weight, 0);
  const normalizedScore = factorOutputs.reduce(
    (sum, fo) => sum + (fo.contribution * fo.weight / totalWeight),
    0
  );

  const score = Math.round(Math.min(100, Math.max(0, normalizedScore)));
  const level = formula.levels.find(l => score >= l.score_min && score < l.score_max)
             ?? formula.levels[formula.levels.length - 1];

  return {
    score,
    level,
    factor_breakdown: factorOutputs,        // for the transparency drawer
    computed_at: new Date(),
  };
}

function evaluateFactor(card: Card, factor: ExecFormulaFactor): FactorOutput {
  const raw = readFieldFromCard(card, factor.field_path);
  const scaled = applyScaling(raw, factor.scaling, factor.scaling_config);
  return {
    factor_id: factor.id,
    factor_name: factor.name,
    raw_value: raw,
    scaled_value: scaled,
    contribution: scaled,                   // 0-100
    weight: factor.weight,
  };
}
```

**Transparency:** every score has a factor breakdown. Click a card → see exactly why it's at level Critical: "Days in stage contributed 42 of the 87 score. Staleness contributed 28. Deal value contributed 17."

The CEO can debug their own formula. They can tweak weights and re-run against historical data.

---

## DATABASE

```sql
-- Columns (the swim lanes)
CREATE TABLE exec_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data_source TEXT NOT NULL,
  data_source_config JSONB NOT NULL DEFAULT '{}',
  formula_id UUID REFERENCES exec_formulas(id),
  sort_order INTEGER DEFAULT 0,
  icon TEXT DEFAULT 'columns',
  color TEXT DEFAULT '#6EE05A',
  card_template_id UUID,
  visible_when TEXT DEFAULT 'always',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Formulas (named urgency engines)
CREATE TABLE exec_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Factors (inputs to a formula)
CREATE TABLE exec_formula_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES exec_formulas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  factor_type TEXT NOT NULL,
  field_path TEXT,
  weight DECIMAL(4,3) NOT NULL DEFAULT 0.500,
  scaling TEXT NOT NULL DEFAULT 'linear',
  scaling_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Levels (urgency tiers)
CREATE TABLE exec_formula_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES exec_formulas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_label TEXT,
  score_min INTEGER NOT NULL,
  score_max INTEGER NOT NULL,
  color TEXT NOT NULL,
  bg_color TEXT,
  icon TEXT,
  blink BOOLEAN DEFAULT false,
  position_priority INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Notification rules
CREATE TABLE exec_notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  channels JSONB NOT NULL DEFAULT '[]',
  cooldown_minutes INTEGER DEFAULT 60,
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Card actions
CREATE TABLE exec_card_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  show_in_levels TEXT[] DEFAULT '{}',
  show_for_columns UUID[] DEFAULT '{}',
  confirm_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

-- Layouts
CREATE TABLE exec_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  column_ids UUID[] NOT NULL DEFAULT '{}',
  global_filters JSONB DEFAULT '{}',
  view_mode TEXT DEFAULT 'columns',
  group_by TEXT DEFAULT 'column',
  sort_within TEXT DEFAULT 'urgency_score',
  show_completed BOOLEAN DEFAULT false,
  refresh_interval_seconds INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots (auto)
CREATE TABLE exec_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  layout_id UUID REFERENCES exec_layouts(id),
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  column_states JSONB NOT NULL,
  total_cards INTEGER,
  by_level JSONB,
  formula_versions JSONB
);

-- Alert log (auto)
CREATE TABLE exec_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES exec_notification_rules(id),
  card_id TEXT,
  fired_at TIMESTAMPTZ DEFAULT now(),
  level TEXT,
  channels_sent TEXT[],
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  payload JSONB
);

CREATE INDEX idx_exec_columns ON exec_columns(user_id, is_active, sort_order);
CREATE INDEX idx_exec_formulas ON exec_formulas(user_id);
CREATE INDEX idx_exec_factors ON exec_formula_factors(formula_id, sort_order);
CREATE INDEX idx_exec_levels ON exec_formula_levels(formula_id, score_min);
CREATE INDEX idx_exec_rules ON exec_notification_rules(user_id, is_active);
CREATE INDEX idx_exec_actions ON exec_card_actions(user_id, sort_order);
CREATE INDEX idx_exec_layouts ON exec_layouts(user_id, is_default);
CREATE INDEX idx_exec_snapshots ON exec_snapshots(user_id, snapshot_at DESC);
CREATE INDEX idx_exec_alerts ON exec_alert_log(rule_id, acknowledged, fired_at DESC);
```

---

## API SURFACE

### Configuration

```
GET    /api/exec/columns                — list user's columns
POST   /api/exec/columns                — create column
PATCH  /api/exec/columns/[id]           — update
DELETE /api/exec/columns/[id]           — soft delete

GET    /api/exec/formulas               — list formulas
POST   /api/exec/formulas               — create formula (with factors + levels)
PATCH  /api/exec/formulas/[id]          — update formula or replace factors/levels
POST   /api/exec/formulas/[id]/test     — dry-run formula against sample cards
POST   /api/exec/formulas/[id]/clone    — fork an existing formula

GET    /api/exec/notification-rules     — list rules
POST   /api/exec/notification-rules     — create
PATCH  /api/exec/notification-rules/[id] — update
POST   /api/exec/notification-rules/[id]/test — fire test alert

GET    /api/exec/card-actions           — list actions
POST   /api/exec/card-actions           — create
PATCH  /api/exec/card-actions/[id]      — update

GET    /api/exec/layouts                — list layouts
POST   /api/exec/layouts                — create
PATCH  /api/exec/layouts/[id]           — update (rearrange columns, change filters)
POST   /api/exec/layouts/[id]/set-default — pin as default
```

### Runtime

```
GET  /api/exec/dashboard?layout=[id]    — main fetch: returns columns + cards + scores
POST /api/exec/refresh                  — force re-fetch of all card data
POST /api/exec/cards/[id]/act           — execute a card action
POST /api/exec/cards/[id]/snooze        — suppress alerts for X hours
POST /api/exec/alerts/[id]/ack          — acknowledge an alert
```

### Cron / Background

```
POST /api/cron/exec-evaluate            — every 5 min: re-score all cards, fire rules
POST /api/cron/exec-snapshot            — every hour: write snapshot
POST /api/cron/exec-digest              — runs notification rules with cron triggers
POST /api/exec/webhooks/crm             — CRM stage change → re-evaluate touched cards
```

---

## SETUP WIZARD (5 steps)

The first time a user opens 0nExec, the setup wizard walks them through configuration. Skippable for power users who want to start from a JSON import.

### Step 1 — Pick a starter pack (or build from scratch)

```
What kind of company are you running 0nExec for?

  ○ Sales team (CRM pipeline tracker)
  ○ Service team (ticket/SLA tracker)
  ○ Property management (maintenance + leasing)
  ○ Education (enrollment + retention)
  ○ Generic (build it myself)
  ○ Import from JSON (.0n file)

[Skip wizard, I know what I'm doing]
```

Each pack is a pre-built bundle of columns + a formula + levels + 1 notification rule + 4 card actions. **Pre-built starting points, not hardcoded behavior.** The user can edit anything afterward.

### Step 2 — Configure your columns

For each column the user wants:

```
Column #1
  Name:           [Sales                    ]
  Data source:    [CRM Pipeline ▼]
  Pipeline:       [Main Sales Pipeline ▼]
  Stage:          [Discovery ▼]
  Icon:           [briefcase ▼]
  Color:          [#6EE05A ▼]
  Formula:        [Default Time-Based ▼]   [+ Build new formula]

[Add another column]    [Continue →]
```

### Step 3 — Build (or pick) your urgency formula

```
Formula: [Sales Urgency v1                        ]

Factors (drag to reorder):
  ┌─────────────────────────────────────────────┐
  │ Days in stage             50%   ▓▓▓▓▓░░░░░  │
  │ Linear, cap at 30 days                      │
  ├─────────────────────────────────────────────┤
  │ Last activity staleness   25%   ▓▓░░░░░░░░  │
  │ Exponential                                 │
  ├─────────────────────────────────────────────┤
  │ Deal value                15%   ▓░░░░░░░░░  │
  │ Logarithmic                                 │
  ├─────────────────────────────────────────────┤
  │ Unassigned penalty        10%   ▓░░░░░░░░░  │
  │ Threshold (full weight if no owner)         │
  └─────────────────────────────────────────────┘
  [+ Add factor]

Levels:
  On Track    [0  ]–[49 ]   #6EE05A  ░ no blink
  Watch       [50 ]–[69 ]   #fb923c  ░ no blink
  Warning     [70 ]–[84 ]   #fbbf24  ░ no blink
  Critical    [85 ]–[100]   #ef4444  ▓ blink
  [+ Add level]    [Test against last 30d data →]
```

### Step 4 — Notification rules

```
Add your first rule:

  When [card enters Critical level ▼]
  In   [any of my columns ▼]
  Send [Slack message ▼] to [#ceo-alerts ▼]
  Cooldown: [60] minutes
  Message: "{{contact.name}} is now Critical in {{column.name}}"

[+ Add another rule]   [Continue →]
```

### Step 5 — Save your default layout

```
Layout name: [My CEO View                    ]
Columns to include: ✓ all
View mode:  ● Columns    ○ List    ○ Grid    ○ Priority Stack
Group by:   [Column ▼]
Sort within column: [Urgency score (highest first) ▼]
Refresh every: [60] seconds

[Save & Open Dashboard]
```

After Step 5, the user lands on their fully configured dashboard.

---

## DASHBOARD PAGE: `app/dashboard/exec/page.tsx`

### Header

```
┌─────────────────────────────────────────────────────┐
│ 0nExec                            [Layout: My View ▼]│
│ ████ 3 critical  ███ 7 warning  ███ 28 on track     │
│ Updated: 2 minutes ago      [⟳ Refresh]  [⚙ Config] │
└─────────────────────────────────────────────────────┘
```

The badge counts use the **user's level names**, not hardcoded "critical/warning/on track." If the user named their levels "Hot / Warm / Cold," that's what shows.

### Body: column view (or list, grid, priority-stack — driven by layout)

In column mode, each column header shows:

```
┌──────────────────┐
│ ⚡ SALES         │
│ Formula: Sales v1│
│ 12 cards         │
│ ★ 2 critical    │
└──────────────────┘
```

Cards within a column are sorted by `urgency_score DESC`. Within a level, ties broken by `position_priority` then `days_in_stage`.

### Card click → action drawer

```
┌──────────────────────────────────────┐
│ Acme Corp                            │
│ Score: 87/100   Level: Critical      │
├──────────────────────────────────────┤
│ Why this score? (factor breakdown)   │
│ ▸ Days in stage:   42/50  (35 pts)   │
│ ▸ Staleness:       18/25  (18 pts)   │
│ ▸ Deal value:      12/15  (12 pts)   │
│ ▸ Unassigned:      10/10  (22 pts)   │
├──────────────────────────────────────┤
│ Contact: John Doe                    │
│ Email:   john@acme.com               │
│ Value:   $12,000                     │
│ Entered Sales: Apr 13, 2026          │
├──────────────────────────────────────┤
│ ACTIONS (configured by you):         │
│ [Call Now]  [Send Quote Workflow]    │
│ [Reassign] [Move Stage]              │
│ [Custom: 'Mark VIP']  [Snooze 24h]   │
└──────────────────────────────────────┘
```

The action buttons are pulled from `exec_card_actions` filtered by current level + column. Click → POST `/api/exec/cards/[id]/act` with the action id.

---

## CHROME EXTENSION TAB

In the extension, render the user's default layout in `view_mode: 'list'` regardless of saved mode (the sidebar is too narrow for columns).

Same engine, same formula, same actions — only the renderer changes.

```
┌──────────────────────────────────────┐
│ COMPANY PULSE          [Layout ▼]    │
│ ██ 3 critical  ██ 7 warning  ██ 28  │
├──────────────────────────────────────┤
│ ── CRITICAL ──                       │
│ ┌──────────────────────────────────┐ │
│ │● Sales · Acme Corp · 87/100     │ │
│ │  Day 15 · No activity 3d        │ │
│ │  [Call] [Quote] [Reassign]      │ │
│ └──────────────────────────────────┘ │
│ ── WARNING ──                        │
│ ┌──────────────────────────────────┐ │
│ │● Onboard · BrightCo · 72/100    │ │
│ │  Day 8 · Last: yesterday        │ │
│ │  [Check In] [Note]              │ │
│ └──────────────────────────────────┘ │
│ ── ON TRACK (collapsed) ──           │
│ ▶ 28 items                           │
└──────────────────────────────────────┘
```

Action buttons in the extension are limited to the first 3 from the user's `card_actions` config that match the card's level. Tap a card to open the full drawer.

---

## ALERT EXAMPLES (template-driven)

User-defined `message_template` gets rendered with mustache. Variables available: `{{contact.*}}`, `{{column.*}}`, `{{level.*}}`, `{{card.*}}`, `{{score.*}}`, `{{factor.*}}`.

**Default starter rule message:**
```
🔴 {{level.name}}: {{contact.name}} in {{column.name}}
Score: {{score.value}}/100
Days in stage: {{card.days_in_stage}}
Last activity: {{card.last_activity}}

{{actions.list}}
```

**Cron digest template:**
```
📊 0nExec Digest — {{date}}

Levels (your config):
{{#each levels}}
  {{name}}: {{count}}
{{/each}}

Top 3 most urgent:
{{#each top3}}
  • {{contact.name}} — {{column.name}} (score {{score}})
{{/each}}
```

---

## STARTER PACKS (the seeds — fully editable after install)

| Pack | Columns | Formula factors | Levels | Sample rule |
|------|---------|-----------------|--------|-------------|
| **Sales** | New Lead → Discovery → Proposal → Negotiate → Closed | days, staleness, value, unassigned | OT/Watch/Warn/Critical | Slack on Critical |
| **Service** | Open → Triaged → In Progress → Awaiting Customer → Resolved | days, SLA, priority field | Green/Amber/Red/SLA-Breach | SMS on SLA-Breach |
| **Property** | Maintenance Open → Scheduled → In Progress → Done · Lease Renewal Watch · Rent Late | days, value, tenant tier | OT/Watch/Critical | Email + Slack |
| **Education** | Inquiry → App Started → App Complete → Enrolled · At-Risk Students | days, last contact, GPA delta | OT/Watch/At-Risk | Counselor email |
| **Generic** | Stage A · Stage B · Stage C | days only, weight 100% | OT/Warn/Critical | Slack only |

Pack install = inserts rows into `exec_columns`, `exec_formulas`, `exec_formula_factors`, `exec_formula_levels`, `exec_notification_rules`, `exec_card_actions`, `exec_layouts`. After insert, all rows are editable.

---

## .0n EXPORT / IMPORT

A user's full 0nExec config exports as a single `.0n` file:

```yaml
# my-exec-config.0n
version: 1
type: exec_config
columns:
  - name: Sales
    data_source: crm_pipeline
    config:
      pipeline_id: pipe_xxx
      stage_id: stage_yyy
formulas:
  - name: Sales Urgency v1
    factors:
      - name: Days in stage
        type: time_in_stage
        weight: 0.5
        scaling: linear
        config: { cap: 30 }
      - name: Staleness
        type: time_since_field
        field_path: last_activity_at
        weight: 0.25
        scaling: exponential
    levels:
      - { name: On Track, score_min: 0,  score_max: 50,  color: "#6EE05A" }
      - { name: Watch,    score_min: 50, score_max: 70,  color: "#fb923c" }
      - { name: Warning,  score_min: 70, score_max: 85,  color: "#fbbf24" }
      - { name: Critical, score_min: 85, score_max: 101, color: "#ef4444", blink: true }
notification_rules:
  - name: CEO Critical Alert
    trigger: level_entered
    trigger_config: { level_id: "{{ref:levels.Critical}}" }
    channels:
      - { type: slack, target: "#ceo-alerts" }
card_actions:
  - { name: Call Now, action_type: crm_call, icon: phone }
  - { name: Send Quote, action_type: workflow, action_config: { workflow_slug: send-quote } }
layouts:
  - name: My CEO View
    column_ids: ["{{ref:columns.Sales}}"]
    view_mode: columns
    is_default: true
```

Import via `POST /api/exec/import` with the `.0n` file. Useful for cloning a working setup across locations or sharing a configuration with another CEO.

---

## PRICING

| Tier | Price | Columns | Formulas | Rules | Layouts | Card actions |
|------|-------|---------|----------|-------|---------|--------------|
| Starter | $79/mo | 5 | 1 | 3 | 1 | 5 |
| Pro | $199/mo | 15 | 5 | 15 | 5 | 25 |
| Enterprise | $499/mo | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited + custom webhooks + import/export |

---

## BUILD ORDER

```
1. Database (8 tables: columns, formulas, factors, levels, rules, actions, layouts, snapshots, alert_log)
2. Urgency engine library (lib/exec/engine.ts) — pure function, fully unit-tested
3. Configuration APIs (columns, formulas, factors, levels, rules, actions, layouts CRUD)
4. Setup wizard UI (app/dashboard/exec/setup/page.tsx) — 5 steps, skippable
5. Starter pack installer (POST /api/exec/install-pack)
6. Dashboard runtime API (/api/exec/dashboard)
7. Dashboard page (app/dashboard/exec/page.tsx) — column / list / grid / priority-stack renderers
8. Card action drawer with factor breakdown
9. Action executor (POST /api/exec/cards/[id]/act)
10. Notification engine + rule evaluator (cron every 5 min)
11. Channel adapters (Slack, email, SMS, webhook, in-app, Discord, CRM task)
12. Snapshot + digest cron
13. .0n export / import endpoints
14. Chrome extension Exec tab (list mode renderer)
15. Formula test runner (replay against last 30d cards)
```

---

## COMMIT

```bash
cd ~/Github/onork-app
git add -A && git commit -m "0nExec: configurable engine — columns, formulas, factors, levels, rules, actions, layouts" && git push origin main
```

---

## WHY THIS WINS

Other dashboards say: *"Here are your numbers."*
Hardcoded SaaS dashboards say: *"Here are the numbers we think you should care about."*

**0nExec says: "Tell us what matters. We'll watch it. We'll color it. We'll alert when it slips."**

The CEO is the architect. We're the construction crew.

No charts. No graphs. No reports. Just: *what's late, by your definition, in the order you care about, with the actions you built, surfaced through the channels you chose.*

**Tagline: "Your company at a glance. Your rules. Your colors. Your actions."**

---

*0nExec — the configurable urgency engine.*
*0ncore.com | Built by RocketOpp LLC*
