/**
 * CRM REST Client — re-exports from @/lib/crm
 *
 * Provides the CRM API functions for use in sub-modules
 * (e.g., heygen-sync.ts) that import from @/lib/crm/client.
 */

export {
  crmGet,
  crmPost,
  crmPut,
  crmDelete,
  getAuthForLocation,
  getPitForLocation,
} from '@/lib/crm'
