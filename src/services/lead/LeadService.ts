import type { LeadRequest, LeadResponse } from '@/types'

export interface LeadService {
  submitLead(request: LeadRequest): Promise<LeadResponse>
}
