import type { AnnualMileage, ContractMonths } from '@/types'
import type { PricingMeta } from '@/services/pricing/rentalEstimate.types'

/**
 * 개발용 시뮬레이션 가정값.
 * 실제 렌트사 요율이 아니며 simulation 모드에서만 사용합니다.
 * verified 모드에 그대로 적용하지 마세요.
 */
export const RENTAL_SIMULATION_META: PricingMeta = {
  pricingVersion: 'sim-dev-2026-03',
  effectiveDate: '2026-03-01',
  pricingSource: 'internal-simulation-assumptions',
  pricingMode: 'simulation',
}

/** 계약기간별 기본 잔존가치율 */
export const BASE_RESIDUAL_RATE_BY_TERM: Record<ContractMonths, number> = {
  36: 0.58,
  48: 0.51,
  60: 0.45,
}

/**
 * 연간 주행거리별 잔존가치율 조정 (percentage points → 소수).
 * 예: +4%p → +0.04
 */
export const MILEAGE_RESIDUAL_ADJUSTMENT: Record<
  Exclude<AnnualMileage, 'unlimited'> | 'unlimited',
  number
> = {
  10000: 0.04,
  15000: 0.02,
  20000: 0,
  30000: -0.04,
  unlimited: -0.08,
}

/** 연 금융요율 (가정값) */
export const ANNUAL_FINANCE_RATE = 0.05

/** 월 운영비용 — 보험·세금·정비 등을 묶은 개발용 가정값 (원) */
export const MONTHLY_OPERATING_COST = 180_000

/** 보증금 연 할인율 (가정값) */
export const DEPOSIT_ANNUAL_DISCOUNT_RATE = 0.02
