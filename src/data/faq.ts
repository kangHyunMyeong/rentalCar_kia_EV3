import type { FaqItem } from '@/types'

/**
 * FAQ 콘텐츠 데이터.
 * 향후 관리자/API 응답으로 교체 가능한 계층입니다.
 */
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-estimate-accuracy',
    question: '월 예상 렌트료가 실제 계약 금액과 동일한가요?',
    answer:
      '아니요. 표시된 금액은 선택하신 조건을 바탕으로 계산한 참고용 예상 렌트료입니다.\n\n실제 계약 금액은 렌트사별 요율, 프로모션, 보험 및 심사 조건 등에 따라 달라질 수 있습니다.',
  },
  {
    id: 'faq-prepay-deposit',
    question: '선납금과 보증금은 어떻게 다른가요?',
    answer:
      '선납금은 렌트료 일부를 미리 납부하는 방식으로, 일반적으로 계약 종료 시 반환되지 않습니다.\n\n보증금은 계약 이행을 위해 맡기는 금액으로, 계약 종료 시 계약 조건에 따라 반환 또는 정산됩니다.',
  },
  {
    id: 'faq-mileage-over',
    question: '약정 주행거리를 초과하면 어떻게 되나요?',
    answer:
      '약정된 주행거리를 초과한 상태로 차량을 반납하면 계약 조건에 따라 초과 운행 부담금이 발생할 수 있습니다.\n\n적용 기준과 금액은 렌트사 및 상품에 따라 차이가 있을 수 있습니다.',
  },
  {
    id: 'faq-vehicle-takeover',
    question: '계약 종료 후 차량을 인수할 수 있나요?',
    answer:
      '차량 인수 가능 여부는 선택한 렌트 상품과 계약 조건에 따라 달라집니다.\n\n반납, 인수, 연장 가능 여부와 인수가격은 상담 시 확인할 수 있습니다.',
  },
  {
    id: 'faq-consultation-guide',
    question: '상담 신청 후 어떤 내용을 안내받나요?',
    answer:
      '선택하신 EV3 트림, 계약기간, 선납금, 보증금, 연간 약정 주행거리 등을 바탕으로 실제 적용 가능한 렌트 조건과 금액을 안내합니다.',
  },
]

export const FAQ_SECTION_COPY = {
  eyebrow: 'FREQUENTLY ASKED QUESTIONS',
  headline: '궁금한 점을\n확인해 보세요.',
  description:
    'EV3 장기렌트에 대해 자주 묻는 질문을 모았습니다.\n더 궁금한 점은 상담을 통해 안내해 드립니다.',
} as const

export const CLOSING_CTA_COPY = {
  eyebrow: 'YOUR NEXT EV3',
  headline: '내 EV3 견적,\n이제 상담으로 완성하세요.',
  description: '선택하신 조건을 바탕으로\n실제 적용 가능한 렌트 조건을 확인해 보세요.',
  primaryLabel: '맞춤 견적 상담 신청하기',
  secondaryLabel: '견적 다시 확인하기',
} as const

/** Closing CTA 배경 — 제공된 원본 이미지 */
export const CLOSING_CTA_IMAGE = '/assets/ev3/ev3_01.webp'
