/**
 * 핏카컴퍼니 사업자 정보.
 * rentalCar_kia_EV5 Footer와 동일한 확인된 값만 포함합니다.
 * 미확인 항목은 null로 두고 UI에 표시하지 않습니다.
 */
export const COMPANY_INFO = {
  brandNameKo: '핏카컴퍼니',
  brandNameEn: 'FITCAR COMPANY',
  legalName: '핏카컴퍼니',
  representative: '김민철',
  businessNumber: '578-36-01253',
  address: '인천 서구 파랑로 495 에이스하이테크시티 1동 1004호',
  /** TODO: EV5 Footer에도 없음 — 확인 후 등록 */
  phone: null as string | null,
  /** TODO: EV5 Footer에도 없음 — 확인 후 등록 */
  email: null as string | null,
  tagline: 'EV3 장기렌트 견적·상담',
} as const

/** EV5와 동일하게 모달로 제공하는 정책 콘텐츠 */
export const FOOTER_POLICIES = {
  privacy: {
    id: 'privacy',
    label: '개인정보처리방침',
    title: '개인정보처리방침',
    sections: [
      {
        heading: '1. 개인정보의 수집 및 이용 목적',
        body: '핏카컴퍼니는 기아 EV3 장기렌트 견적 안내, 맞춤 상담 매니저 배정 및 고객 문의 응대를 목적으로 개인정보를 수집·이용합니다.',
      },
      {
        heading: '2. 수집하는 개인정보 항목',
        body: '성명, 휴대전화번호, 희망 트림 및 계약 조건(이용 기간, 선납금·보증금 비율, 연간 주행거리 등).',
      },
      {
        heading: '3. 보유 및 이용 기간',
        body: '상담 완료 및 고객 서비스 제공 완료 시점까지 보유하며, 정보주체의 삭제 요청 시 지체 없이 파기합니다.',
      },
      {
        heading: '4. 개인정보의 파기 절차',
        body: '보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 재생 불가능한 기술적 방법을 사용하여 안전하게 파기합니다.',
      },
    ],
  },
  terms: {
    id: 'terms',
    label: '이용약관',
    title: '서비스 이용약관',
    sections: [
      {
        heading: '제1조 (목적)',
        body: '본 약관은 핏카컴퍼니가 제공하는 기아 EV3 장기렌트 견적·상담 서비스의 이용 조건 및 절차에 관한 제반 사항을 규정함을 목적으로 합니다.',
      },
      {
        heading: '제2조 (견적 및 계약 안내)',
        body: '사이트 상에 표기된 월 예상 렌트료는 참고용 시뮬레이션 금액이며, 고객님의 신용 평가 결과, 렌트사 요율, 프로모션 및 최종 심사 조건에 따라 실제 계약 금액이 상이할 수 있습니다.',
      },
      {
        heading: '제3조 (회사의 의무)',
        body: '핏카컴퍼니는 고객님의 소중한 정보를 안전하게 보호하며, 정확한 견적 안내 및 친절한 상담 서비스를 제공하기 위해 최선을 다합니다.',
      },
    ],
  },
} as const

export type FooterPolicyId = keyof typeof FOOTER_POLICIES
