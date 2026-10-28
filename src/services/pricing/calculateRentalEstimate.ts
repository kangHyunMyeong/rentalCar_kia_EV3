import {
  ANNUAL_FINANCE_RATE,
  BASE_RESIDUAL_RATE_BY_TERM,
  DEPOSIT_ANNUAL_DISCOUNT_RATE,
  MILEAGE_RESIDUAL_ADJUSTMENT,
  MONTHLY_OPERATING_COST,
  RENTAL_SIMULATION_META,
} from '@/data/rentalSimulationConfig'
import { getVehiclePriceBeforeTax, RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'
import type { AnnualMileage, ContractMonths, QuoteSelection, TrimId } from '@/types'
import type {
  PricingMeta,
  PricingMode,
  RentalEstimateBreakdown,
  RentalEstimateResult,
} from './rentalEstimate.types'

const DATA_REQUIRED_MESSAGE = '견적 데이터 확인 필요'

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function roundToThousand(value: number): number {
  return Math.round(value / 1000) * 1000
}

export function resolveResidualValueRate(
  contractMonths: ContractMonths,
  annualMileage: AnnualMileage,
): number | null {
  const base = BASE_RESIDUAL_RATE_BY_TERM[contractMonths]
  const adjustment = MILEAGE_RESIDUAL_ADJUSTMENT[annualMileage]

  if (typeof base !== 'number' || typeof adjustment !== 'number') {
    return null
  }

  const rate = base + adjustment
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) {
    return null
  }

  return rate
}

function fail(
  code: Extract<RentalEstimateResult, { ok: false }>['code'],
  meta: PricingMeta = RENTAL_SIMULATION_META,
): RentalEstimateResult {
  return {
    ok: false,
    code,
    message: DATA_REQUIRED_MESSAGE,
    meta,
  }
}

/**
 * 개발용 시뮬레이션 월 렌트료 계산 (순수 함수).
 * 실제 렌트사 요율·계약 산식과 일치하지 않습니다.
 */
export function calculateRentalEstimate(selection: QuoteSelection): RentalEstimateResult {
  const meta = RENTAL_SIMULATION_META
  const trimId = selection.trimId as TrimId

  if (!(trimId in RENTAL_VEHICLE_PRICES)) {
    return fail('UNKNOWN_TRIM', meta)
  }

  const vehiclePrice = getVehiclePriceBeforeTax(trimId)

  if (vehiclePrice === undefined || !isFinitePositive(vehiclePrice)) {
    return fail('MISSING_VEHICLE_PRICE', meta)
  }

  const N = selection.contractMonths
  if (N !== 36 && N !== 48 && N !== 60) {
    return fail('INVALID_CONTRACT_MONTHS', meta)
  }

  const residualRate = resolveResidualValueRate(N, selection.annualMileage)
  if (residualRate === null) {
    return fail('MISSING_RESIDUAL_RATE', meta)
  }

  if (
    !isFiniteNonNegative(ANNUAL_FINANCE_RATE) ||
    !isFiniteNonNegative(MONTHLY_OPERATING_COST) ||
    !isFiniteNonNegative(DEPOSIT_ANNUAL_DISCOUNT_RATE)
  ) {
    return fail('CONFIG_ERROR', meta)
  }

  const V = vehiclePrice
  const P = V * (selection.prepaymentPercent / 100)
  const D = V * (selection.depositPercent / 100)
  const R = V * residualRate
  const C = V - P

  const depreciation = (C - R) / N
  const financeCost = ((C + R) / 2) * (ANNUAL_FINANCE_RATE / 12)
  const depositDiscount = D * (DEPOSIT_ANNUAL_DISCOUNT_RATE / 12)
  const monthlyRaw = depreciation + financeCost + MONTHLY_OPERATING_COST - depositDiscount

  if (
    !Number.isFinite(monthlyRaw) ||
    monthlyRaw < 0 ||
    !Number.isFinite(depreciation) ||
    !Number.isFinite(financeCost) ||
    !Number.isFinite(depositDiscount)
  ) {
    return fail('INVALID_RESULT', meta)
  }

  const monthlyEstimate = roundToThousand(monthlyRaw)

  if (!Number.isFinite(monthlyEstimate) || monthlyEstimate < 0) {
    return fail('INVALID_RESULT', meta)
  }

  const breakdown: RentalEstimateBreakdown = {
    vehiclePriceBeforeTax: V,
    prepaymentAmount: P,
    depositAmount: D,
    residualValueRate: residualRate,
    residualValue: R,
    financedBasis: C,
    monthlyDepreciation: depreciation,
    monthlyFinanceCost: financeCost,
    monthlyOperatingCost: MONTHLY_OPERATING_COST,
    monthlyDepositDiscount: depositDiscount,
    monthlyEstimateRaw: monthlyRaw,
    monthlyEstimate,
  }

  return {
    ok: true,
    monthlyEstimate,
    breakdown,
    meta,
  }
}

/**
 * pricingMode에 따라 견적을 해석합니다.
 * verified 모드에서는 simulation 가정값을 절대 사용하지 않습니다.
 */
export function resolveRentalEstimate(
  selection: QuoteSelection,
  pricingMode: PricingMode,
): RentalEstimateResult {
  if (pricingMode === 'verified') {
    return {
      ok: false,
      code: 'VERIFIED_RATE_UNAVAILABLE',
      message: DATA_REQUIRED_MESSAGE,
      meta: {
        pricingVersion: 'verified-unavailable',
        effectiveDate: new Date().toISOString().slice(0, 10),
        pricingSource: 'none',
        pricingMode: 'verified',
      },
    }
  }

  return calculateRentalEstimate(selection)
}

export function getActivePricingMode(): PricingMode {
  const mode = import.meta.env.VITE_PRICING_MODE
  if (mode === 'api' || mode === 'verified') return 'verified'
  // demo / none / simulation / 미설정 → 개발용 simulation
  return 'simulation'
}
