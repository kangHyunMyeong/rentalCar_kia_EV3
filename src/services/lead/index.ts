import { AdminLeadService } from './AdminLeadService'
import type { LeadService } from './LeadService'

export function createLeadService(): LeadService {
  return new AdminLeadService()
}

export type { LeadService } from './LeadService'
export { ADMIN_LEAD_API_URL, ADMIN_LEAD_SITE_ID } from './adminLeadConfig'
