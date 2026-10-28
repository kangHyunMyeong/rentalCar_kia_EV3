import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  PrepaymentPercent,
  TrimId,
} from '@/types'

/** simulation: 참고·가정 계산 / verified: 실제 계약 요율 */
export type PricingMode = 'simulation' | 'verified'

export type EstimateStatus =
  | 'verified_partner_quote'
  | 'public_reference'
  | 'simulation_assumption'
  | 'consultation_required'

export interface PricingMeta {
  pricingVersion: string
  effectiveDate: string
  pricingSource: string
  pricingMode: PricingMode
  estimateStatus: EstimateStatus
}

export interface RentalEstimateInput {
  trimId: TrimId
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
  annualMileage: AnnualMileage
  contractMonths: ContractMonths
  vehiclePriceBeforeTax: number
}

export interface RentalEstimateBreakdown {
  vehiclePriceBeforeTax: number
  referenceMonthlyRate: number
  mileageAdjustment: number
  prepaymentAmount: number
  prepaymentMonthlyReduction: number
  depositAmount: number
  depositMonthlyDiscount: number
  /** 반올림 전 */
  rawMonthlyRent: number
  /** 100원 단위 반올림 후 — UI/상담 표시용 */
  roundedMonthlyRent: number
}

export type RentalEstimateErrorCode =
  | 'MISSING_VEHICLE_PRICE'
  | 'UNKNOWN_TRIM'
  | 'MISSING_REFERENCE_RATE'
  | 'INVALID_CONTRACT_MONTHS'
  | 'INVALID_RESULT'
  | 'CONFIG_ERROR'
  | 'UNLIMITED_MILEAGE_CONSULTATION'
  | 'VERIFIED_RATE_UNAVAILABLE'

export type RentalEstimateResult =
  | {
      ok: true
      /** UI 표시용 — roundedMonthlyRent와 동일 */
      monthlyEstimate: number
      rawMonthlyRent: number
      roundedMonthlyRent: number
      breakdown: RentalEstimateBreakdown
      meta: PricingMeta
    }
  | {
      ok: false
      code: RentalEstimateErrorCode
      message: string
      meta: PricingMeta
    }
