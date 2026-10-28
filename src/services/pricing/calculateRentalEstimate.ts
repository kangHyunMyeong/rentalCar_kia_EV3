import { DEPOSIT_ANNUAL_DISCOUNT_RATE } from '@/data/rentalSimulationConfig'
import {
  getReferenceMonthlyRate,
  RENTAL_REFERENCE_META,
} from '@/data/rentalReferenceRates'
import { getVehiclePriceBeforeTax, RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'
import type { QuoteSelection, TrimId } from '@/types'
import { computeLegacyMileageAdjustment } from './legacyMileageDelta'
import type {
  EstimateStatus,
  PricingMeta,
  PricingMode,
  RentalEstimateBreakdown,
  RentalEstimateResult,
} from './rentalEstimate.types'

const DATA_REQUIRED_MESSAGE = '견적 데이터 확인 필요'
const UNLIMITED_MESSAGE = '무제한 주행 조건은 상담 후 확인'

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

/** 최종 월 렌트료 100원 단위 반올림 (Math.round) */
export function roundMonthlyRent(amount: number): number {
  return Math.round(amount / 100) * 100
}

function buildMeta(estimateStatus: EstimateStatus): PricingMeta {
  return {
    pricingVersion: RENTAL_REFERENCE_META.version,
    effectiveDate: RENTAL_REFERENCE_META.sourceDate,
    pricingSource: RENTAL_REFERENCE_META.sourceName,
    pricingMode: 'simulation',
    estimateStatus,
  }
}

function fail(
  code: Extract<RentalEstimateResult, { ok: false }>['code'],
  message: string,
  estimateStatus: EstimateStatus = 'consultation_required',
): RentalEstimateResult {
  return {
    ok: false,
    code,
    message,
    meta: buildMeta(estimateStatus),
  }
}

function resolveEstimateStatus(input: {
  annualMileage: QuoteSelection['annualMileage']
  depositPercent: QuoteSelection['depositPercent']
}): EstimateStatus {
  if (input.annualMileage === 'unlimited') return 'consultation_required'
  if (input.annualMileage !== 20_000 || input.depositPercent > 0) {
    return 'simulation_assumption'
  }
  return 'public_reference'
}

/**
 * V2 월 예상 렌트료 계산.
 * 공개 참고 기준 요율 + 주행거리(임시) / 선납 / 보증 조정.
 * 기존 금융 5%·운영비 18만원을 기준 요율에 중복 가산하지 않습니다.
 */
export function calculateRentalEstimate(selection: QuoteSelection): RentalEstimateResult {
  const trimId = selection.trimId as TrimId

  if (!(trimId in RENTAL_VEHICLE_PRICES)) {
    return fail('UNKNOWN_TRIM', DATA_REQUIRED_MESSAGE)
  }

  const vehiclePrice = getVehiclePriceBeforeTax(trimId)
  if (vehiclePrice === undefined || !isFinitePositive(vehiclePrice)) {
    return fail('MISSING_VEHICLE_PRICE', DATA_REQUIRED_MESSAGE)
  }

  const N = selection.contractMonths
  if (N !== 36 && N !== 48 && N !== 60) {
    return fail('INVALID_CONTRACT_MONTHS', DATA_REQUIRED_MESSAGE)
  }

  if (selection.annualMileage === 'unlimited') {
    return fail('UNLIMITED_MILEAGE_CONSULTATION', UNLIMITED_MESSAGE, 'consultation_required')
  }

  const referenceMonthlyRate = getReferenceMonthlyRate(trimId, N)
  if (referenceMonthlyRate === undefined) {
    return fail('MISSING_REFERENCE_RATE', DATA_REQUIRED_MESSAGE)
  }

  if (!isFiniteNonNegative(DEPOSIT_ANNUAL_DISCOUNT_RATE)) {
    return fail('CONFIG_ERROR', DATA_REQUIRED_MESSAGE)
  }

  const mileageAdjustment = computeLegacyMileageAdjustment({
    vehiclePriceBeforeTax: vehiclePrice,
    contractMonths: N,
    annualMileage: selection.annualMileage,
    prepaymentPercent: selection.prepaymentPercent,
    depositPercent: selection.depositPercent,
  })

  if (mileageAdjustment === null) {
    return fail('INVALID_RESULT', DATA_REQUIRED_MESSAGE)
  }

  const prepaymentAmount = vehiclePrice * (selection.prepaymentPercent / 100)
  const prepaymentMonthlyReduction = prepaymentAmount / N
  const depositAmount = vehiclePrice * (selection.depositPercent / 100)
  const depositMonthlyDiscount = depositAmount * (DEPOSIT_ANNUAL_DISCOUNT_RATE / 12)

  const rawMonthlyRent =
    referenceMonthlyRate +
    mileageAdjustment -
    prepaymentMonthlyReduction -
    depositMonthlyDiscount

  if (!Number.isFinite(rawMonthlyRent) || rawMonthlyRent < 0) {
    return fail('INVALID_RESULT', DATA_REQUIRED_MESSAGE)
  }

  const roundedMonthlyRent = roundMonthlyRent(rawMonthlyRent)
  if (!Number.isFinite(roundedMonthlyRent) || roundedMonthlyRent < 0) {
    return fail('INVALID_RESULT', DATA_REQUIRED_MESSAGE)
  }

  const estimateStatus = resolveEstimateStatus({
    annualMileage: selection.annualMileage,
    depositPercent: selection.depositPercent,
  })

  const breakdown: RentalEstimateBreakdown = {
    vehiclePriceBeforeTax: vehiclePrice,
    referenceMonthlyRate,
    mileageAdjustment,
    prepaymentAmount,
    prepaymentMonthlyReduction,
    depositAmount,
    depositMonthlyDiscount,
    rawMonthlyRent,
    roundedMonthlyRent,
  }

  return {
    ok: true,
    monthlyEstimate: roundedMonthlyRent,
    rawMonthlyRent,
    roundedMonthlyRent,
    breakdown,
    meta: buildMeta(estimateStatus),
  }
}

/**
 * pricingMode에 따라 견적을 해석합니다.
 * verified 모드에서는 public_reference·simulation 가정값을 사용하지 않습니다.
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
        estimateStatus: 'consultation_required',
      },
    }
  }

  return calculateRentalEstimate(selection)
}

export function getActivePricingMode(): PricingMode {
  const mode = import.meta.env.VITE_PRICING_MODE
  if (mode === 'api' || mode === 'verified') return 'verified'
  return 'simulation'
}

/** @deprecated V1 잔존가치 — 테스트 호환용으로 legacy 모듈 재수출 */
export { computeLegacyMileageAdjustment } from './legacyMileageDelta'
