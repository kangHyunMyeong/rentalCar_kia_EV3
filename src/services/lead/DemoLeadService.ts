import type { LeadRequest, LeadResponse } from '@/types'
import { AdminLeadService } from './AdminLeadService'
import type { LeadService } from './LeadService'

/**
 * @deprecated 시연 모드는 제거되었습니다. Admin 공개 API로 위임합니다.
 */
export class DemoLeadService implements LeadService {
  private readonly admin = new AdminLeadService()

  async submitLead(request: LeadRequest): Promise<LeadResponse> {
    return this.admin.submitLead(request)
  }
}
