/**
 * Integration-aware swap — when a workflow references an integration the
 * user hasn't connected (e.g. Google Sheets), substitute a CRM-native
 * equivalent so the workflow still runs end-to-end.
 *
 * The swap rules express the principle Mike framed: "if we already have
 * the same effect available natively in CRM, use that instead of asking
 * the user to add a new integration."
 */

import type { NormalizedStep } from './action-mapper'

export interface AvailableIntegrations {
  /** Always true on 0nCore — every account has CRM. */
  crm: true
  google_sheets: boolean
  slack: boolean
  airtable: boolean
  notion: boolean
}

export interface SwapResult {
  step: NormalizedStep
  swapped: boolean
  swap_note?: string
}

/**
 * Each rule:
 *   - guard:  step.action === X AND specific integration is missing
 *   - swap:   produce a new step using a CRM-native equivalent
 *   - note:   what to show the user about the swap
 */
export function swapForAvailable(
  step: NormalizedStep,
  available: AvailableIntegrations,
): SwapResult {
  // Google Sheets append → CRM list + tag (same filter effect)
  if (step.action === 'gsheet_append' && !available.google_sheets) {
    const tabName =
      (step.config.tab as string) ||
      (step.config.sheet_name as string) ||
      step.display_name ||
      'Workflow output'
    return {
      step: {
        ...step,
        action: 'crm_add_tag',
        display_name: `Tag for filter: ${tabName}`,
        config: {
          contact_id: step.config.contact_id ?? '{{search.output.contacts[0].id}}',
          tags: [tabName],
          // Carry the row payload as a CRM note so nothing is lost
          note_payload: step.config.row,
        },
      },
      swapped: true,
      swap_note: `Google Sheets isn't connected; using a CRM tag "${tabName}" instead. Same filter effect — pull this list from /contacts?tag=${tabName}.`,
    }
  }

  // Slack notify → CRM internal note (if Slack not connected)
  if (step.action === 'slack_send_message' && !available.slack) {
    return {
      step: {
        ...step,
        action: 'crm_create_note',
        display_name: `Internal note (was Slack): ${step.display_name}`,
        config: {
          contact_id:
            (step.config.contact_id as string) ||
            '{{search.output.contacts[0].id}}',
          body:
            (step.config.text as string) ||
            (step.config.message as string) ||
            JSON.stringify(step.config),
        },
      },
      swapped: true,
      swap_note:
        'Slack isn\'t connected; this step now drops an internal CRM note instead. Connect Slack to send to a channel directly.',
    }
  }

  // Airtable / Notion → CRM custom-field stamp
  if ((step.action === 'airtable_create_record' && !available.airtable) ||
      (step.action === 'notion_create_page' && !available.notion)) {
    return {
      step: {
        ...step,
        action: 'crm_update_contact',
        display_name: `${step.display_name} (CRM fallback)`,
        config: {
          contact_id: step.config.contact_id,
          custom_fields: step.config.fields ?? step.config.properties ?? {},
        },
      },
      swapped: true,
      swap_note:
        'External integration not connected; mirroring the data into CRM custom fields instead.',
    }
  }

  return { step, swapped: false }
}

/**
 * Best-effort detection of what's connected for a given user/location.
 * Reads from `crm_installations` (CRM is always present) + a
 * `user_integrations` table if it exists (created by the connector flow).
 * Defaults to CRM-only when uncertain — that's the safest swap target.
 */
export async function detectAvailable(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  _locationId: string,
): Promise<AvailableIntegrations> {
  // CRM is always considered available on this platform
  const out: AvailableIntegrations = {
    crm: true,
    google_sheets: false,
    slack: false,
    airtable: false,
    notion: false,
  }

  try {
    const { data } = await supabase
      .from('user_integrations')
      .select('provider, status')
      .eq('user_id', userId)
      .eq('status', 'active')

    for (const row of data || []) {
      const p = String(row.provider || '').toLowerCase()
      if (p === 'google_sheets' || p === 'gsheets') out.google_sheets = true
      if (p === 'slack')   out.slack = true
      if (p === 'airtable') out.airtable = true
      if (p === 'notion')  out.notion = true
    }
  } catch {
    // table doesn't exist — keep CRM-only defaults
  }

  return out
}
