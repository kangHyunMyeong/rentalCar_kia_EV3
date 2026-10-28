/** 개인정보 안내 문구 — 운영 확정 시 이 파일만 교체 */
export const PRIVACY_CONSENT = {
  title: '개인정보 수집 및 이용 동의',
  summary: '상담 목적의 이름·연락처 수집·이용에 동의합니다.',
  details: [
    '수집 항목: 이름, 휴대전화번호, 선택한 견적 조건',
    '이용 목적: EV3 장기렌트 견적 안내 및 상담 연락',
    '보유 기간: 상담 목적 달성 후 관련 법령에 따른 기간 또는 동의 철회 시까지',
    '동의 거부 시: 맞춤 견적 상담 신청이 제한될 수 있습니다',
  ],
} as const

export const MARKETING_CONSENT = {
  title: '마케팅 정보 수신 동의 (선택)',
  summary: '이벤트·프로모션 등 마케팅 정보 수신에 동의합니다.',
} as const
