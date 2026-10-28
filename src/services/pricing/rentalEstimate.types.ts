import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  PrepaymentPercent,
  TrimId,
} from '@/types'

/** simulation: 개발용 가정값 참고 계산 / verified: 실제 계약 요율 */
export type PricingMode = 'simulation' | 'verified'

export interface PricingMeta {
  pricingVersion: string
  effectiveDate: string
  pricingSource: string
  pricingMode: PricingMode
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
  prepaymentAmount: number
  depositAmount: number
  residualValueRate: number
  residualValue: number
  financedBasis: number
  monthlyDepreciation: number
  monthlyFinanceCost: number
  monthlyOperatingCost: number
  monthlyDepositDiscount: number
  monthlyEstimateRaw: number
  monthlyEstimate: number
}

export type RentalEstimateErrorCode =
  | 'MISSING_VEHICLE_PRICE'
  | 'UNKNOWN_TRIM'
  | 'MISSING_RESIDUAL_RATE'
  | 'INVALID_CONTRACT_MONTHS'
  | 'INVALID_RESULT'
  | 'CONFIG_ERROR'
  | 'VERIFIED_RATE_UNAVAILABLE'

export type RentalEstimateResult =
  | {
      ok: true
      monthlyEstimate: number
      breakdown: RentalEstimateBreakdown
      meta: PricingMeta
    }
  | {
      ok: false
      code: RentalEstimateErrorCode
      message: string
      meta: PricingMeta
    }
