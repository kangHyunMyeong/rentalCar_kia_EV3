import type { LeadRequest, LeadResponse } from '@/types'
import type { LeadService } from './LeadService'

/**
 * 백엔드 미연결 시연용.
 * 개인정보를 저장·전송하지 않으며, 실제 접수 완료로 표시하지 않습니다.
 */
export class DemoLeadService implements LeadService {
  async submitLead(_request: LeadRequest): Promise<LeadResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    return {
      mode: 'demo',
      accepted: false,
      message:
        '시연 모드입니다. 상담 신청 API가 연결되지 않아 실제 접수는 이루어지지 않았습니다. 선택하신 견적 조건만 확인용으로 처리되었습니다.',
    }
  }
}
