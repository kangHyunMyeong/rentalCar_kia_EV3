import type { RentalEstimateResult } from '../rentalEstimate.types'
import type { EstimateStatus } from '../rentalEstimate.types'
import { V5_ENGINE_META } from './config'
import type { V5EstimateResult } from './types'

function mapStatus(
  s: Extract<V5EstimateResult, { ok: true }>['estimate']['estimateStatus'],
): EstimateStatus {
  if (s === 'consultation_required') return 'consultation_required'
  if (s === 'public_reference') return 'public_reference'
  return 'simulation_assumption'
}

/** UI/상담 스냅샷 호환을 위해 V5 → 기존 RentalEstimateResult 형태로 변환 */
export function toRentalEstimateResultFromV5(
  result: V5EstimateResult,
): RentalEstimateResult {
  if (!result.ok) {
    const estimateStatus: EstimateStatus =
      result.code === 'UNLIMITED_MILEAGE_CONSULTATION'
        ? 'consultation_required'
        : 'consultation_required'
    return {
      ok: false,
      code:
        result.code === 'MISSING_BASE_RATE'
          ? 'MISSING_REFERENCE_RATE'
          : result.code === 'UNLIMITED_MILEAGE_CONSULTATION'
            ? 'UNLIMITED_MILEAGE_CONSULTATION'
            : result.code === 'UNKNOWN_TRIM'
              ? 'UNKNOWN_TRIM'
              : result.code === 'MISSING_VEHICLE_PRICE'
                ? 'MISSING_VEHICLE_PRICE'
                : result.code === 'INVALID_CONTRACT_MONTHS'
                  ? 'INVALID_CONTRACT_MONTHS'
                  : 'INVALID_RESULT',
      message: result.message,
      meta: {
        pricingVersion: V5_ENGINE_META.version,
        effectiveDate: '2026-10-29',
        pricingSource: 'v5-market-reference',
        pricingMode: 'simulation',
        estimateStatus,
      },
    }
  }

  const e = result.estimate
  return {
    ok: true,
    monthlyEstimate: e.monthlyRental,
    rawMonthlyRent: e.rawMonthlyRental,
    roundedMonthlyRent: e.monthlyRental,
    breakdown: {
      vehiclePriceBeforeTax: e.vehiclePriceBeforeTax,
      referenceMonthlyRate: e.baseMarketRate,
      mileageAdjustment: e.mileageAdjustment + e.optionColorMonthlyAdjustment,
      prepaymentAmount: e.prepaymentAmount,
      prepaymentMonthlyReduction: e.prepaymentMonthlyReduction,
      depositAmount: e.depositAmount,
      depositMonthlyDiscount: e.depositMonthlyDiscount,
      rawMonthlyRent: e.rawMonthlyRental,
      roundedMonthlyRent: e.monthlyRental,
    },
    meta: {
      pricingVersion: V5_ENGINE_META.version,
      effectiveDate: '2026-10-29',
      pricingSource: 'v5-market-reference',
      pricingMode: 'simulation',
      estimateStatus: mapStatus(e.estimateStatus),
    },
  }
}
