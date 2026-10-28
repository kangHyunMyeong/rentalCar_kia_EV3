import {
  ANNUAL_FINANCE_RATE,
  BASE_RESIDUAL_RATE_BY_TERM,
  DEPOSIT_ANNUAL_DISCOUNT_RATE,
  MILEAGE_RESIDUAL_ADJUSTMENT,
  MONTHLY_OPERATING_COST,
} from '@/data/rentalSimulationConfig'
import type { AnnualMileage, ContractMonths, DepositPercent, PrepaymentPercent } from '@/types'

/**
 * V1 시뮬레이션 순수 월 렌트료 (개발용).
 * V2 최종 월 렌트료로 사용하지 않으며,
 * 주행거리 조정 차액 추출에만 사용합니다.
 */
export function legacySimulateMonthlyRent(input: {
  vehiclePriceBeforeTax: number
  contractMonths: ContractMonths
  annualMileage: AnnualMileage
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
}): number | null {
  const { vehiclePriceBeforeTax: V, contractMonths: N, annualMileage } = input
  const base = BASE_RESIDUAL_RATE_BY_TERM[N]
  const adjustment = MILEAGE_RESIDUAL_ADJUSTMENT[annualMileage]
  if (typeof base !== 'number' || typeof adjustment !== 'number') return null

  const residualRate = base + adjustment
  if (!Number.isFinite(residualRate) || residualRate <= 0 || residualRate >= 1) return null

  const P = V * (input.prepaymentPercent / 100)
  const D = V * (input.depositPercent / 100)
  const R = V * residualRate
  const C = V - P
  const depreciation = (C - R) / N
  const financeCost = ((C + R) / 2) * (ANNUAL_FINANCE_RATE / 12)
  const depositDiscount = D * (DEPOSIT_ANNUAL_DISCOUNT_RATE / 12)
  const monthly = depreciation + financeCost + MONTHLY_OPERATING_COST - depositDiscount

  return Number.isFinite(monthly) ? monthly : null
}

/**
 * 동일 조건에서 20,000km 대비 선택 주행거리의 V1 차액.
 * 금융·운영비를 기준 요율에 다시 더하지 않기 위한 임시 조정값입니다.
 */
export function computeLegacyMileageAdjustment(input: {
  vehiclePriceBeforeTax: number
  contractMonths: ContractMonths
  annualMileage: AnnualMileage
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
}): number | null {
  if (input.annualMileage === 20_000) return 0
  if (input.annualMileage === 'unlimited') return null

  const selected = legacySimulateMonthlyRent(input)
  const baseline = legacySimulateMonthlyRent({ ...input, annualMileage: 20_000 })
  if (selected === null || baseline === null) return null
  return selected - baseline
}
