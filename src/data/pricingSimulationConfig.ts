import type { AnnualMileage, ContractMonths } from '@/types'
import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'

/**
 * V3 예상 견적 시뮬레이션 설정.
 * 모든 요율·비용은 내부 가정값이며 렌트사·캐피탈 공식 요율이 아닙니다.
 * 운영 V2(`rentalReferenceRates`)와 독립입니다.
 */

export type AssumptionKind = 'verified' | 'internal_assumption' | 'not_applied'

export interface AssumptionMeta {
  kind: AssumptionKind
  label: string
  note: string
}

export const PRICING_SIMULATION_META = {
  version: '2026-10-29-simulation-v3',
  engineId: 'residual-finance-simulation',
  status: 'internal_assumption' as const,
  disclaimer:
    '잔존가치·금융·운영비는 내부 가정 시뮬레이션입니다. 실제 렌트사 견적과 다를 수 있으며 확정 계약 금액이 아닙니다.',
}

/** 기본 차량가 기준 — 렌트사별 상이할 수 있어 설정으로 분리 */
export const DEFAULT_VEHICLE_PRICE_BASIS: VehiclePriceBasis = 'beforeTaxBenefit'

export const VEHICLE_PRICE_BASIS_META: AssumptionMeta = {
  kind: 'verified',
  label: 'vehiclePriceBasis',
  note: '기아 공식 가격표 수치. 선납·보증 % 기준가는 DEFAULT_VEHICLE_PRICE_BASIS로 선택(추후 렌트사별 설정 가능).',
}

/**
 * 계약기간별 기본 잔존가치율 (차량가 대비).
 * 내부 가정 — 렌트사 잔가표 아님.
 */
export const SIM_RESIDUAL_RATE_BY_TERM: Record<ContractMonths, number> = {
  36: 0.58,
  48: 0.51,
  60: 0.45,
}

export const SIM_RESIDUAL_META: AssumptionMeta = {
  kind: 'internal_assumption',
  label: 'residualValueRates',
  note: '개발용 가정 잔가율. 실제 금융사 잔존가치표와 동일하지 않음.',
}

/**
 * 연간 주행거리 → 잔가율 가감 (percentage points → 소수).
 * 내부 가정.
 */
export const SIM_MILEAGE_RESIDUAL_ADJUSTMENT: Record<
  Exclude<AnnualMileage, 'unlimited'> | 'unlimited',
  number
> = {
  10000: 0.04,
  15000: 0.02,
  20000: 0,
  30000: -0.04,
  unlimited: -0.08,
}

export const SIM_MILEAGE_META: AssumptionMeta = {
  kind: 'internal_assumption',
  label: 'mileageResidualAdjustment',
  note: '약정 주행거리에 따른 잔가 가감 가정. 겟차 등 공개 설명의 방향성만 참고.',
}

/**
 * 계약기간별 연 금융요율 (가정).
 * 기간별로 분리 관리 — 현재는 동일값. 실제 MF/금리가 아님.
 */
export const SIM_ANNUAL_FINANCE_RATE_BY_TERM: Record<ContractMonths, number> = {
  36: 0.05,
  48: 0.05,
  60: 0.05,
}

export const SIM_FINANCE_META: AssumptionMeta = {
  kind: 'internal_assumption',
  label: 'financingRates',
  note: '연 5% 내부 가정. 렌트사 money factor·실행금리가 아님.',
}

/** 월 보험료 가정 (원) — 번들 분해용 */
export const SIM_MONTHLY_INSURANCE = 120_000
export const SIM_MONTHLY_TAX = 30_000
export const SIM_MONTHLY_MAINTENANCE = 30_000

export const SIM_OPERATING_META: AssumptionMeta = {
  kind: 'internal_assumption',
  label: 'insuranceTaxMaintenance',
  note: '보험 12만 + 세금 3만 + 정비 3만 = 월 18만 내부 가정. 실제 포함 범위·금액과 다를 수 있음.',
}

/** 보증금 연 할인율 — 내부 가정 (롯데 공개 3.5% 등 미적용) */
export const SIM_DEPOSIT_ANNUAL_DISCOUNT_RATE = 0.02

export const SIM_DEPOSIT_META: AssumptionMeta = {
  kind: 'internal_assumption',
  label: 'depositAnnualDiscountRate',
  note: '연 2% 내부 가정. 제휴 미확인 타사 공개율을 적용하지 않음. 원금 미차감.',
}

export const SIM_PREPAID_META: AssumptionMeta = {
  kind: 'internal_assumption',
  label: 'prepaidCapitalReduction',
  note: '기본 엔진은 차량 자본(가격−선납) 감소 후 감가·금융 재계산. P/N은 비교용 보조 모드.',
}

export const SIM_PROMOTION_MONTHLY = 0

export const SIM_PROMOTION_META: AssumptionMeta = {
  kind: 'not_applied',
  label: 'promotions',
  note: '프로모션 미적용(0). 임의 할인 금지.',
}

/**
 * 부가세 처리.
 * 산출 월액을 VAT 포함 표시로 가정하며, 별도 ×1.1을 하지 않음.
 */
export const SIM_VAT_MODE = 'assumed_included_no_extra' as const

export const SIM_VAT_META: AssumptionMeta = {
  kind: 'internal_assumption',
  label: 'vat',
  note: '부가세 별도 가산 없음(포함가로 가정). 실제 견적의 VAT 표기와 다를 수 있음.',
}

/** 과소 견적 의심 임계 — 상향 보정하지 않고 플래그만 */
export const SIM_SUSPICIOUSLY_LOW_MONTHLY = 150_000
