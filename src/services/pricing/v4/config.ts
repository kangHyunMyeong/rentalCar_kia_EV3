import type { AnnualMileage, ContractMonths } from '@/types'
import type { V4EvidenceKind } from './types'

/**
 * V4 독립 예상 견적 설정.
 * 기아 공식 PDF 차량가를 출발점으로 하며, 요율·운영비는 내부 가정입니다.
 * 롯데·겟차 등 외부 참고금액을 목표값으로 사용하지 않습니다.
 */

export const V4_ENGINE_META = {
  version: '2026-10-29-v4',
  engineId: 'official-price-residual-finance-v4',
  disclaimer:
    '기아 공식 차량가격 기반 독립 시뮬레이션입니다. 잔존가치·금융·운영비는 내부 가정이며 렌트사 확정 견적이 아닙니다. 보조금·할인은 미확인으로 자동 차감하지 않습니다.',
}

export interface V4ConfigValue<T> {
  value: T
  evidence: V4EvidenceKind
  note: string
}

/** 계약기간별 잔존가치율 — 공식 잔가표 아님 */
export const V4_RESIDUAL_RATE_BY_TERM: V4ConfigValue<
  Record<ContractMonths, number>
> = {
  value: {
    36: 0.58,
    48: 0.51,
    60: 0.45,
  },
  evidence: 'internal_assumption',
  note: 'V3와 동일 내부 가정. 렌트사 잔가표·PDF 잔가가 아님. 임의 재설정하지 않음.',
}

/** 주행거리 → 잔가율 가감 (residual_adjustment 모드) */
export const V4_MILEAGE_RESIDUAL_ADJUSTMENT: V4ConfigValue<
  Record<Exclude<AnnualMileage, 'unlimited'> | 'unlimited', number>
> = {
  value: {
    10000: 0.04,
    15000: 0.02,
    20000: 0,
    30000: -0.04,
    unlimited: -0.08,
  },
  evidence: 'internal_assumption',
  note: '약정거리↑ → 잔가↓ 방향성만 반영한 내부 가정. 실제 요율표 미확보.',
}

/**
 * 주행거리 → 월액 가감 (flat_monthly_delta 비교용).
 * residual_adjustment와 동시 적용 금지.
 */
export const V4_MILEAGE_FLAT_MONTHLY_DELTA: V4ConfigValue<
  Record<Exclude<AnnualMileage, 'unlimited'> | 'unlimited', number>
> = {
  value: {
    10000: -20_000,
    15000: -10_000,
    20000: 0,
    30000: 25_000,
    unlimited: 50_000,
  },
  evidence: 'internal_assumption',
  note: '비교용 월액 가감. 기본 엔진은 residual_adjustment 사용.',
}

export const V4_ANNUAL_FINANCE_RATE_BY_TERM: V4ConfigValue<
  Record<ContractMonths, number>
> = {
  value: {
    36: 0.05,
    48: 0.05,
    60: 0.05,
  },
  evidence: 'internal_assumption',
  note: '연 5% 근사. 렌트사 실행금리·Money Factor가 아님.',
}

/** 월 보험 — 내부 가정 */
export const V4_MONTHLY_INSURANCE: V4ConfigValue<number> = {
  value: 120_000,
  evidence: 'internal_assumption',
  note: '장기렌트 포함 보험의 월 환산 가정. 연령·대물·자차 조건 미반영.',
}

/**
 * 월 자동차세 — V3 월 30,000 과다 가능성 재검토.
 * 공개 안내: 영업용 전기 승용 자동차세 연 20,000원 수준 → 월 ≈ 1,667원.
 * 교육세 등 부가는 미확인.
 */
export const V4_MONTHLY_VEHICLE_TAX: V4ConfigValue<number> = {
  value: Math.round(20_000 / 12),
  evidence: 'internal_assumption',
  note: '영업용 전기 승용 연 2만원 공개 안내를 월 환산한 내부 가정. 지자체·교육세 미확인. V3 월 3만원은 채택하지 않음.',
}

export const V4_MONTHLY_MAINTENANCE: V4ConfigValue<number> = {
  value: 30_000,
  evidence: 'internal_assumption',
  note: '정비 포함 상품 가정. Self(미포함) 시 0에 가까울 수 있음 — 미확인.',
}

export const V4_MONTHLY_OTHER_OPERATING: V4ConfigValue<number> = {
  value: 0,
  evidence: 'unverified',
  note: '기타 운영비 미확인 → 0. 취득·등록비는 월 운영에 중복 가산하지 않음.',
}

export const V4_DEPOSIT_ANNUAL_DISCOUNT_RATE: V4ConfigValue<number> = {
  value: 0.02,
  evidence: 'internal_assumption',
  note: '연 2% 내부 가정. EV5 6%·롯데 공개 3.5% 미이식.',
}

export const V4_VERIFIED_PROMOTION_MONTHLY: V4ConfigValue<number> = {
  value: 0,
  evidence: 'unverified',
  note: '검증된 프로모션 없음 → 0.',
}

export const V4_VAT_TREATMENT: V4ConfigValue<string> = {
  value: 'assumed_included_no_extra_multiplier',
  evidence: 'internal_assumption',
  note: '산출 월액을 VAT 포함가로 가정하고 ×1.1 추가 가산 없음. 실제 표기 미확인.',
}

export const V4_SUBSIDY_TREATMENT: V4ConfigValue<'unconfirmed_not_applied'> = {
  value: 'unconfirmed_not_applied',
  evidence: 'unverified',
  note: '보조금 반영액 미확인. 0원으로 확정한 것이 아니라 자동 차감하지 않음.',
}

/** 과소 의심 임계 — 상향 보정 금지, 플래그만 */
export const V4_SUSPICIOUSLY_LOW_MONTHLY = 150_000

/**
 * PDF 선택옵션 카탈로그 요약 (가격은 세제전 표기).
 * 세제후 옵션가 PDF 별도 미확인 → afterTax 미기입.
 * V4 입력에 옵션을 넣지 않으면 합계 0.
 */
export const V4_PDF_OPTION_NOTES = {
  source: 'kia-official-price-list-2026 (price_ev3.pdf)',
  modelYear: '2026',
  optionAfterTaxBenefit: 'unconfirmed' as const,
  note: '옵션 패키지(스타일·컴포트·모니터링 등)는 PDF에 세제전 원 단위로 존재. 옵션별 세제후 별도표가 없어 임의 세금 계산 금지. 현재 UI는 옵션 미연결 → 기본 계산은 트림 기본가만 사용.',
}
