# Canvas Phase 2 — Consolidated Build Spec

> ONE file. Everything Claude Code needs. Build in order. Push after each section. Get this thing pumping.

**Working directory:** `cd ~/Github/onork-app`
**Rules:** Groq for AI. No GHL. Lucide icons. Tailwind only. Push to main.

---

## PRIORITY 1: Chip-to-Blocks — Make Jaxx Build Flows on the Canvas

### The Problem
Jaxx understands commands and shows action chips, but nothing appears on the canvas.

### The Fix

**A. Update the Jaxx chat handler (`app/api/canvas/ai-build/route.ts` or wherever Jaxx processes messages)**

When Groq returns a response, ALSO generate a flow definition:

```typescript
// After getting Groq's text response, call Groq again to generate the flow
const flowPrompt = `Given this user request, generate a canvas flow as JSON.
Each block: { id: "block_" + random, type: string, position: {x, y}, data: {label, config} }
Each edge: { id: "e_" + random, source: block_id, target: block_id }

Block types available: contacts, pipeline, calendar, invoices, send_email, send_sms, 
post_linkedin, ai_compose, ai_score_vpis, filter, condition, delay, course_builder, 
run_hipaa_scan, package_service, webhook, stripe_checkout, stat, note, summarize

Layout: left-to-right, first block at x:200 y:250, 300px horizontal spacing.

User request: "${userMessage}"

Return ONLY: { "blocks": [...], "edges": [...] }`;

const flowResponse = await groq(flowPrompt, { response_format: { type: 'json_object' } });
```

Return both the message AND the flow:
```json
{
  "message": "Here's a flow to generate and score a LinkedIn post.",
  "chips": ["Compose Post", "VPIS Score", "Post LinkedIn"],
  "flow": {
    "blocks": [...],
    "edges": [...]
  }
}
```

**B. Update the Canvas component to render flows from Jaxx**

When the chat panel receives a response with a `flow` object:

```typescript
function handleJaxxResponse(response) {
  addMessage(response.message, 'jaxx');
  
  if (response.flow?.blocks?.length) {
    // Add nodes to React Flow
    const newNodes = response.flow.blocks.map(b => ({
      id: b.id,
      type: b.type,
      position: b.position,
      data: b.data,
    }));
    
    const newEdges = response.flow.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: '#6EE05A' },
    }));
    
    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newEdges]);
    reactFlowInstance.fitView({ padding: 0.2, duration: 500 });
  }
}
```

**C. Wire chip clicks to add individual blocks**

```typescript
const CHIP_TO_BLOCK = {
  'Compose Post': { type: 'ai_compose', label: 'AI Compose' },
  'Share Post': { type: 'post_linkedin', label: 'Post LinkedIn' },
  'Engage Score': { type: 'ai_score_vpis', label: 'VPIS Score' },
  'VPIS Score': { type: 'ai_score_vpis', label: 'VPIS Score' },
  'Summarize': { type: 'summarize', label: 'Summarize' },
  'Send Email': { type: 'send_email', label: 'Send Email' },
  'Filter': { type: 'filter', label: 'Filter' },
  'Build Course': { type: 'course_builder', label: 'Course Builder' },
  'HIPAA Scan': { type: 'run_hipaa_scan', label: 'HIPAA Scan' },
};

function handleChipClick(chipLabel) {
  const block = CHIP_TO_BLOCK[chipLabel];
  if (!block) return;
  const maxX = Math.max(200, ...nodes.map(n => n.position.x));
  const newNode = {
    id: `block_${Date.now()}`,
    type: block.type,
    position: { x: maxX + 300, y: 250 },
    data: { label: block.label, config: {} },
  };
  setNodes(prev => [...prev, newNode]);
  // Auto-connect to last node
  if (nodes.length > 0) {
    setEdges(prev => [...prev, {
      id: `e_${Date.now()}`,
      source: nodes[nodes.length - 1].id,
      target: newNode.id,
      animated: true,
      style: { stroke: '#6EE05A' },
    }]);
  }
}
```

### Commit:
```bash
git add -A && git commit -m "Canvas: Jaxx chat spawns blocks, chips add nodes, AI generates full flows" && git push origin main
```

---

## PRIORITY 2: Block Toolbar — Click a Block, Configure It

### The Concept
Right panel switches between Jaxx (no selection) and Block Toolbar (block selected). Click canvas background → back to Jaxx.

**Create: `components/canvas/BlockToolbar.tsx`**

Main wrapper that renders the correct toolbar based on block type:

```typescript
export function BlockToolbar({ block, onUpdate, onDelete, onDuplicate, onExecute, onClose }) {
  if (!block) return null;
  
  const ToolbarComponent = TOOLBAR_MAP[block.type] || DefaultToolbar;
  
  return (
    <div className="w-80 h-full bg-[#0d1117] border-l border-[#30363d] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d] flex items-center gap-2">
        <BlockIcon type={block.type} />
        <div className="flex-1">
          <div className="text-sm font-bold text-[#e6edf3]">{block.data?.label || block.type}</div>
          <div className="text-xs text-[#484f58]">{block.type} block</div>
        </div>
        <button onClick={onClose} className="text-[#484f58] hover:text-[#e6edf3]">
          <X size={16} />
        </button>
      </div>
      
      {/* Block-specific config */}
      <div className="flex-1 overflow-y-auto p-4">
        <ToolbarComponent block={block} onUpdate={onUpdate} />
      </div>
      
      {/* Footer actions */}
      <div className="p-3 border-t border-[#30363d] flex gap-2">
        <button onClick={() => onExecute(block.id)} className="flex-1 py-2 bg-[#6EE05A] text-[#0d1117] rounded-lg font-bold text-sm">
          Execute
        </button>
        <button onClick={() => onDuplicate(block.id)} className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg text-[#e6edf3]">
          <Copy size={14} />
        </button>
        <button onClick={() => onDelete(block.id)} className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg text-[#f87171]">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
```

Create individual toolbar components for each block type. The key ones for launch:

**`toolbar/ContactsToolbar.tsx`** — Tag filter dropdown, date range, sort, limit slider, live preview count
**`toolbar/AIComposeToolbar.tsx`** — Content type dropdown, tone pills, hook style pills, prompt textarea, target VPIS slider
**`toolbar/VPISToolbar.tsx`** — Input source toggle, threshold slider, 8-factor bar display after scoring
**`toolbar/LinkedInToolbar.tsx`** — Account picker, post text editor, first comment, scheduling, approval toggle
**`toolbar/SendEmailToolbar.tsx`** — Template picker, from address, subject, personalization toggles, scheduling
**`toolbar/FilterToolbar.tsx`** — AND/OR toggle, condition rows (field/operator/value), preview count
**`toolbar/DefaultToolbar.tsx`** — Generic JSON config editor for any block type not yet custom-built

### Panel switching in Canvas:

```typescript
const [selectedBlock, setSelectedBlock] = useState(null);

// React Flow callbacks
const onNodeClick = (_, node) => setSelectedBlock(node);
const onPaneClick = () => setSelectedBlock(null);

// Right panel render
{selectedBlock ? (
  <BlockToolbar block={selectedBlock} onUpdate={...} onClose={() => setSelectedBlock(null)} />
) : (
  <ChatPanel />
)}
```

### Commit:
```bash
git add -A && git commit -m "Canvas: block toolbar with 7 block-specific config panels, panel switching" && git push origin main
```

---

## PRIORITY 3: Block Execution Engine — Make Things Happen

### The Concept
When user clicks "Execute" on a block or an entire flow, it actually calls the APIs and shows results inline on each block.

**Create: `lib/canvas/executor.ts`**

```typescript
async function executeBlock(block, inputData, locationId) {
  switch (block.type) {
    case 'contacts':
      return await crmProxy('GET', `/contacts/?${buildFilterQuery(block.data.config)}`, locationId);
    
    case 'filter':
      return filterItems(inputData, block.data.config.conditions);
    
    case 'send_email':
      return await crmProxy('POST', '/conversations/messages', locationId, {
        type: 'Email',
        contactId: inputData.contacts?.map(c => c.id),
        subject: block.data.config.subject,
        message: block.data.config.template,
      });
    
    case 'ai_compose':
      return await fetch('/api/linkedin-bot', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate_post', ...block.data.config }),
      }).then(r => r.json());
    
    case 'ai_score_vpis':
      return await fetch('/api/linkedin-bot', {
        method: 'POST',
        body: JSON.stringify({ action: 'score_post', post_text: inputData.text || block.data.config.text }),
      }).then(r => r.json());
    
    case 'post_linkedin':
      return await fetch('/api/linkedin-bot', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate_post', ...block.data.config }),
      }).then(r => r.json());
    
    case 'course_builder':
      return await fetch('/api/course-builder/generate', {
        method: 'POST',
        body: JSON.stringify(block.data.config),
      }).then(r => r.json());
    
    case 'run_hipaa_scan':
      return await fetch('/api/hipaa/scan', {
        method: 'POST',
        body: JSON.stringify({ publicUrl: block.data.config.url, public: true }),
      }).then(r => r.json());
  }
}

async function executeFlow(nodes, edges, locationId) {
  const sorted = topologicalSort(nodes, edges);
  const results = {};
  
  for (const node of sorted) {
    const upstreamData = getUpstreamResults(node.id, edges, results);
    
    // Update node status: executing
    broadcastNodeUpdate(node.id, { status: 'executing' });
    
    try {
      const result = await executeBlock(node, upstreamData, locationId);
      results[node.id] = result;
      broadcastNodeUpdate(node.id, { status: 'complete', result });
    } catch (err) {
      results[node.id] = { error: err.message };
      broadcastNodeUpdate(node.id, { status: 'error', error: err.message });
      break; // stop flow on error
    }
  }
  
  return results;
}
```

**Create: `app/api/canvas/execute/route.ts`**

```
POST — receives { flow: { nodes, edges }, locationId }
Runs executeFlow()
Returns results per block
```

### Visual feedback during execution:

Each block node component should show execution state:
- **Idle:** normal appearance
- **Executing:** green border pulse animation, spinner icon
- **Complete:** green check badge, result preview inside block
- **Error:** red border, error message

Edges animate during execution — green pulse traveling from source to target.

### The 0nExec Pipeline Opportunity

Instead of just executing and forgetting, **move results through CRM opportunities.**

When a canvas flow executes:

1. Create a CRM opportunity in the "0n Canvas Flows" pipeline
2. Set the stage based on execution progress:
   - "Queued" → flow submitted
   - "Executing" → blocks running
   - "Completed" → all blocks passed
   - "Failed" → a block errored
   - "Published" → results delivered (post published, email sent, etc.)
3. Store the flow definition + results on the opportunity as custom fields
4. The opportunity becomes a record of every flow that's ever run

```typescript
// After flow execution completes:
await crmProxy('POST', '/opportunities/', locationId, {
  name: `Canvas: ${flowName} — ${new Date().toLocaleDateString()}`,
  pipelineId: CANVAS_PIPELINE_ID,
  stageId: allPassed ? COMPLETED_STAGE : FAILED_STAGE,
  monetaryValue: calculateFlowValue(results), // e.g., emails sent × $0.10
  customFields: [
    { key: 'flow_definition', value: JSON.stringify(flow) },
    { key: 'execution_results', value: JSON.stringify(results) },
    { key: 'blocks_executed', value: sorted.length },
    { key: 'execution_time_ms', value: executionTime },
  ],
});
```

This means every Canvas execution is tracked in the CRM pipeline. You can see all flows that ran, their results, and move them through stages. The CRM becomes the execution log.

### Commit:
```bash
git add -A && git commit -m "Canvas: execution engine with CRM pipeline tracking, visual block states, topological flow runner" && git push origin main
```

---

## PRIORITY 4: CRM SDK Wrapper — Canvas Inside the CRM

### SSO Decryption Endpoint

**Create: `app/api/canvas/decrypt-sso/route.ts`**

```typescript
import CryptoJS from 'crypto-js';

const SHARED_SECRET = process.env.CRM_SSO_SHARED_SECRET || 'a420cba6-4e6e-47ba-80e6-75cb57ebf71a';

export async function POST(req) {
  const { encrypted } = await req.json();
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, SHARED_SECRET).toString(CryptoJS.enc.Utf8);
    const userData = JSON.parse(decrypted);
    // userData: { userId, companyId, role, userName, email, activeLocation }
    return NextResponse.json(userData);
  } catch (e) {
    return NextResponse.json({ error: 'Decryption failed' }, { status: 401 });
  }
}
```

Add `CRM_SSO_SHARED_SECRET` to Vercel env vars (type: plain).

### Command Bar JS (for Custom JS module)

**Create: `public/0n-command-bar.js`**

The full command bar script from the Canvas Visual OS spec. Injected on every CRM page via the marketplace app's Custom JS module.

Key points:
- Gets user context via `window.exposeSessionDetails('69c762225a31e1cd2f28dd4c')`
- Sends encrypted payload to `/api/canvas/decrypt-sso` for decryption
- Cmd+K / Ctrl+K opens the overlay
- Commands route to `/api/canvas/command`
- "Open Canvas" navigates to the Custom Page

### Canvas Page for iframe embedding

**Update: `app/canvas/page.tsx`**

Add iframe context detection:
```typescript
useEffect(() => {
  // If inside CRM iframe, request user data
  if (window.parent !== window) {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'REQUEST_USER_DATA_RESPONSE') {
        // Decrypt and set user context
        decryptSSO(event.data.payload).then(setUserContext);
      }
    });
    window.parent.postMessage({ type: 'REQUEST_USER_DATA' }, '*');
  }
}, []);
```

### Marketplace Module Registration (manual — Mike does this)

1. **Custom JS module:** Script URL → `https://0ncore.com/0n-command-bar.js`
2. **Custom Page module:** Page URL → `https://0ncore.com/canvas?locationId={{location.id}}`, Menu label: "0n Canvas"
3. **Conversation AI module:** Webhook → `https://0ncore.com/api/canvas/command`

### Commit:
```bash
git add -A && git commit -m "Canvas CRM SDK: SSO decryption, command bar injection, iframe context detection" && git push origin main
```

---

## PRIORITY 5: More Block Types

Add these high-value blocks to the library:

| Block | Type | What It Does |
|-------|------|-------------|
| WordPress | `wordpress` | Execute any of 43 MCP tools against connected WP site |
| Stripe Checkout | `stripe_checkout` | Create payment link, send to contacts |
| Course Builder | `course_builder` | Generate full course from topic |
| HIPAA Scan | `run_hipaa_scan` | Scan URL for 63 compliance checks |
| Service Packager | `package_service` | Package any capability as Fiverr gig + portfolio |
| Market Intel | `market_intel` | Pull trending skills, match to profile |
| Webhook In | `webhook_in` | Receive external data as trigger |
| Webhook Out | `webhook_out` | Send data to external URL |
| SMS | `send_sms` | Send SMS via CRM |
| WhatsApp | `send_whatsapp` | Send WhatsApp via CRM |
| Create Contact | `create_contact` | Create new CRM contact |
| Update Contact | `update_contact` | Update fields/tags on contact |
| Move Pipeline | `move_pipeline` | Move opportunity to a stage |
| Book Appointment | `book_appointment` | Book calendar appointment |
| Condition | `condition` | If/else branch |
| Delay | `delay` | Wait X minutes/hours/days |
| Loop | `loop` | Repeat for each item |
| Chart | `chart` | Display data as bar/line/pie chart |
| Table | `table` | Display data as sortable table |
| Embed | `embed` | Embed any URL as iframe |

Each block needs:
1. A React Flow node component (visual appearance on canvas)
2. A toolbar component (config panel when selected)
3. An execution handler in `lib/canvas/executor.ts`

For launch, prioritize: WordPress, Stripe, Course Builder, HIPAA, Webhook, SMS, Create/Update Contact, Condition, Delay.

### Commit:
```bash
git add -A && git commit -m "Canvas: 20 additional block types with toolbars and execution handlers" && git push origin main
```

---

## PRIORITY 6: Canvas Persistence + Templates

### Save/Load Flows

Already spec'd. The `canvas_flows` table should exist from the Canvas Phase 1 migration.

```
POST /api/canvas/flows — save current canvas state
GET /api/canvas/flows — list saved canvases
GET /api/canvas/flows/[id] — load a specific canvas
DELETE /api/canvas/flows/[id] — delete
```

### Templates

Pre-built canvas flows that users can load with one click:

```typescript
const TEMPLATES = [
  {
    name: 'Email VIP Contacts',
    description: 'Filter VIP contacts and send a template email',
    blocks: [
      { type: 'contacts', config: { filters: [{ field: 'tag', operator: 'contains', value: 'VIP' }] } },
      { type: 'send_email', config: { template: 'follow-up' } },
    ],
    edges: [{ source: 0, target: 1 }],
  },
  {
    name: 'LinkedIn Post Pipeline',
    description: 'Generate post → VPIS score → publish if 85+',
    blocks: [
      { type: 'ai_compose', config: { type: 'linkedin-post', tone: 'vibe' } },
      { type: 'ai_score_vpis', config: { threshold: 85 } },
      { type: 'post_linkedin', config: {} },
    ],
    edges: [{ source: 0, target: 1 }, { source: 1, target: 2 }],
  },
  {
    name: 'HIPAA Scan & Report',
    description: 'Scan website → generate report → email to contact',
    blocks: [
      { type: 'run_hipaa_scan', config: {} },
      { type: 'send_email', config: { subject: 'Your HIPAA Compliance Report' } },
    ],
    edges: [{ source: 0, target: 1 }],
  },
  {
    name: 'Lead Qualification',
    description: 'New contacts → filter by criteria → add to pipeline → send welcome',
    blocks: [
      { type: 'contacts', config: { filters: [{ field: 'source', operator: 'equals', value: 'website' }] } },
      { type: 'filter', config: { conditions: [{ field: 'email', operator: 'is_not_empty' }] } },
      { type: 'move_pipeline', config: { stage: 'Qualified' } },
      { type: 'send_email', config: { template: 'welcome' } },
    ],
    edges: [{ source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 3 }],
  },
];
```

Add a "Templates" section to the block library or as a tab in the canvas header.

### Commit:
```bash
git add -A && git commit -m "Canvas: flow persistence, 4 pre-built templates, save/load UI" && git push origin main
```

---

## BUILD ORDER SUMMARY

```
Phase 2.1: Chip-to-blocks (Jaxx spawns nodes)          → push
Phase 2.2: Block toolbar (7 config panels)              → push
Phase 2.3: Execution engine (CRM pipeline tracking)     → push
Phase 2.4: CRM SDK wrapper (SSO, command bar, iframe)   → push
Phase 2.5: 20 more block types                          → push
Phase 2.6: Persistence + templates                      → push
```

Each phase is independently deployable. The canvas gets progressively more powerful with each push. After 2.1, Jaxx builds visual flows. After 2.3, flows actually execute. After 2.4, it works inside the CRM. After 2.6, it's a complete visual operating system.

---

*One file. Six phases. The Canvas goes from demo to production.*
*0ncore.com/canvas | 0n — AI Command Center*
