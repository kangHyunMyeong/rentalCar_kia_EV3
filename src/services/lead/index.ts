import { DemoLeadService } from './DemoLeadService'
import type { LeadService } from './LeadService'

export function createLeadService(): LeadService {
  // 향후 VITE_LEAD_API_URL 등이 있으면 ApiLeadService로 교체
  return new DemoLeadService()
}

export type { LeadService } from './LeadService'
