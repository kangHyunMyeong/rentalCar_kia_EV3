/**
 * STEP 7 — 추후 UI 연동 시 사용할 문구 초안.
 * 현재 랜딩페이지 컴포넌트에는 적용하지 않음.
 */

export const V4_UI_COPY = {
  title: '예상 월 렌트료',

  disclaimer: [
    '선택하신 차량 및 계약 조건을 기준으로 산출한',
    '예상 금액입니다.',
    '',
    '실제 월 렌트료는 보험 조건, 심사 결과,',
    '프로모션 및 계약 시점 등에 따라',
    '달라질 수 있습니다.',
  ].join('\n'),

  disclaimerSingleLine:
    '선택하신 차량 및 계약 조건을 기준으로 산출한 예상 금액입니다. 실제 월 렌트료는 보험 조건, 심사 결과, 프로모션 및 계약 시점 등에 따라 달라질 수 있습니다.',

  cta: '무료 맞춤 견적 상담받기',

  evidenceNotes: {
    vehiclePriceOfficial:
      '차량가격은 기아 공식 가격표(PDF) 기준입니다. 월 렌트료는 내부 예상 계산입니다.',
    notFinalContract: '확정 계약 금액이 아닙니다.',
    noUnverifiedPromo: '미확인 프로모션·보조금 혜택은 표시하지 않습니다.',
    depositVsPrepayment:
      '보증금은 만기 반환 가능성이 있는 담보이며, 선납금과 동일한 확정 지출이 아닙니다.',
  },

  displayPrinciples: [
    '예상 월 렌트료 숫자 노출 유지',
    '실제 계약 금액으로 오인되지 않도록 안내',
    '현재 사용자 선택 조건을 함께 표시',
    '원 단위 천 단위 구분기호 적용',
    '모바일에서 금액 가독성 확보',
    '보증금과 선납금 혼동 방지',
    '미확인 프로모션·보조금 표시 금지',
    '공식 PDF 차량가와 내부 예상 월액 구분',
  ] as const,
} as const

export function formatV4MonthlyRentKrw(amount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`
}
