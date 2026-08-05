import type { MeterKey } from '@/lib/meters'

/**
 * Custom Workflow Actions — the "0nCORE: …" steps an agency drops into their
 * NATIVE workflow builder.
 *
 * ONE SOURCE OF TRUTH for the six actions: the portal shells are registered
 * against these keys, the execution endpoint switches on them, the dashboard
 * lists them, and the billing gate reads their meters. A second copy of this
 * list would drift from the portal and the drift would only show up as a live
 * workflow calling a key we do not answer.
 *
 * `fields` is what the agency fills in when they place the step. The exact
 * field-definition FORMAT the portal wants is captured when the first shell is
 * saved; this is the content that goes into it, kept here so all six are
 * defined the same way.
 */

export interface ActionField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  options?: string[]
  required?: boolean
  placeholder?: string
}

export interface WorkflowAction {
  key: string
  name: string
  /** What the agency is told the step does, in the builder. */
  blurb: string
  meter?: MeterKey
  fields: ActionField[]
  /** What later workflow steps can reference. */
  returns: string[]
  /**
   * False until the executor genuinely runs it. The dashboard shows these as
   * "coming" rather than offering an on-switch for something that would fail
   * inside a live client workflow.
   */
  live: boolean
}

export const WORKFLOW_ACTIONS: WorkflowAction[] = [
  {
    key: 'oncore_run_command',
    name: '0nCORE: Run Command',
    blurb: 'Runs a 0nCORE command against the contact that reached this step.',
    fields: [{ key: 'command', label: 'What should happen?', type: 'textarea', required: true }],
    returns: ['receiptId', 'status'],
    live: true,
  },
  {
    key: 'oncore_ai_draft',
    name: '0nCORE: AI Draft Message',
    blurb: 'Writes a message for this contact that later steps can send.',
    fields: [
      { key: 'purpose', label: 'What is the message for?', type: 'textarea', required: true },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Friendly', 'Direct', 'Professional', 'Warm'] },
    ],
    returns: ['draft'],
    live: true,
  },
  {
    key: 'oncore_score_route',
    name: '0nCORE: Score & Route',
    blurb: 'Scores the contact and returns a branch value for an if/else step.',
    fields: [{ key: 'criteria', label: 'What are you scoring for?', type: 'textarea', required: true }],
    returns: ['score', 'branch'],
    live: true,
  },
  {
    /**
     * The action that makes the portal usable: it mints a signed link for the
     * contact the workflow is running on, which an email step then sends.
     * Without this the agency would have to generate links by hand, and a
     * portal nobody can reach is not a portal.
     */
    key: 'oncore_member_link',
    name: '0nCORE: Send Portal Link',
    blurb: 'Creates this member\'s private portal link for the next step to email them.',
    fields: [
      { key: 'expiryDays', label: 'Link valid for (days)', type: 'text', placeholder: '14' },
    ],
    returns: ['portalUrl'],
    live: true,
  },
  {
    key: 'oncore_build_site',
    name: '0nCORE: Build Site',
    blurb: 'Builds a page from one of your templates and returns the URL.',
    meter: 'SITE_BUILD',
    fields: [
      { key: 'template', label: 'Template', type: 'text', required: true },
      { key: 'brand', label: 'Brand notes', type: 'textarea' },
    ],
    returns: ['siteUrl'],
    live: false,
  },
  {
    key: 'oncore_schedule_social',
    name: '0nCORE: Schedule Social',
    blurb: 'Writes and schedules a social post to a connected channel.',
    meter: 'SOCIAL_POST',
    fields: [
      { key: 'channel', label: 'Channel', type: 'text', required: true },
      { key: 'about', label: 'What about?', type: 'textarea', required: true },
    ],
    returns: ['postId'],
    live: false,
  },
]

const BY_KEY = new Map(WORKFLOW_ACTIONS.map((a) => [a.key, a]))
export function workflowAction(key: string): WorkflowAction | undefined {
  return BY_KEY.get(key)
}
