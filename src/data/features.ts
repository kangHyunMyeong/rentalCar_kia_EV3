/**
 * Why EV3 제원 데이터.
 * 공개된 공식 사양 기준이며, 트림·옵션·측정 조건에 따라 달라질 수 있습니다.
 */
export interface WhyEv3Spec {
  id: string
  value: string
  unit?: string
  label: string
  note?: string
  /** 설정 시 스크롤 진입 카운트업 대상 (V2L 등 문자열은 생략) */
  countTo?: number
}

export const WHY_EV3_COPY = {
  index: '02',
  eyebrow: 'WHY EV3',
  title: '작지만, 가능성은 더 크게.',
  description: 'EV3가 일상에 더하는 세 가지 기준.',
} as const

export const WHY_EV3_SPECS: WhyEv3Spec[] = [
  {
    id: 'range',
    value: '501',
    unit: 'km',
    label: '최대 주행거리',
    note: '롱레인지 2WD · 17인치 휠 · 빌트인 캠 미적용 기준. 실제 주행거리는 운전 습관, 기상, 도로 상황 등 조건에 따라 달라질 수 있습니다.',
    countTo: 501,
  },
  {
    id: 'wheelbase',
    value: '2,680',
    unit: 'mm',
    label: '휠베이스',
    note: '공식 제원 기준.',
    countTo: 2680,
  },
  {
    id: 'v2l',
    value: 'V2L',
    label: '전기차 편의 기능',
    note: 'Vehicle to Load. 적용 사양은 트림·옵션에 따라 다를 수 있습니다.',
  },
]
