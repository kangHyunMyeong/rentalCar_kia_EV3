import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  PrepaymentPercent,
  TrimId,
} from '@/types'
import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'
import type { AssumptionMeta } from '@/data/pricingSimulationConfig'

/** capital_reduction: 자본 감소 후 감가·금융 재계산 (기본) / flat_pn: V2식 P/N 비교용 */
export type PrepaidMethod = 'capital_reduction' | 'flat_pn'

export type SimulationVerificationStatus =
  | 'ok'
  | 'needs_verification'
  | 'consultation_required'
  | 'invalid'

export interface SimulationEstimateInput {
  trimId: TrimId
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
  annualMileage: AnnualMileage
  contractMonths: ContractMonths
  /** 기본: beforeTaxBenefit */
  priceBasis?: VehiclePriceBasis
  /** 기본: capital_reduction */
  prepaidMethod?: PrepaidMethod
}

export interface SimulationCostBreakdown {
  vehiclePriceBeforeTaxBenefit: number
  vehiclePriceAfterTaxBenefit: number
  priceBasis: VehiclePriceBasis
  vehiclePriceUsed: number

  residualRate: number
  residualValue: number

  prepaymentPercent: PrepaymentPercent
  prepaymentAmount: number
  prepaidMethod: PrepaidMethod
  financedCapital: number

  monthlyDepreciation: number
  annualFinanceRate: number
  monthlyFinanceCost: number

  monthlyInsurance: number
  monthlyTax: number
  monthlyMaintenance: number
  monthlyOperatingCost: number
  monthlyPromotion: number

  depositPercent: DepositPercent
  depositAmount: number
  depositMonthlyDiscount: number

  /** flat_pn 비교 시 사용. capital_reduction에서는 0 */
  flatPnMonthlyReduction: number

  rawMonthlyRent: number
  roundedMonthlyRent: number

  /** 월 렌트 × 개월 (선납·보증 원금 제외) */
  totalMonthlyPayments: number
  /** 선납금(반환 불가) */
  totalPrepaidOutlay: number
  /** 보증금(만기 반환·인수 충당 가능 — 지출에 포함하되 성격 분리) */
  depositOutlay: number
  /** 월 합계 + 선납 (보증금 제외 — 순 이용 부담 참고) */
  estimatedTotalOutlayExcludingRefundableDeposit: number
  /** 월 합계 + 선납 + 보증 (초기 현금 유출 참고) */
  estimatedTotalCashOutlayIncludingDeposit: number
}

export interface SimulationAssumptionsUsed {
  residual: AssumptionMeta
  finance: AssumptionMeta
  mileage: AssumptionMeta
  operating: AssumptionMeta
  deposit: AssumptionMeta
  prepaid: AssumptionMeta
  promotion: AssumptionMeta
  vat: AssumptionMeta
  priceBasis: AssumptionMeta
}

export type SimulationEstimateResult =
  | {
      ok: true
      monthlyEstimate: number
      breakdown: SimulationCostBreakdown
      assumptions: SimulationAssumptionsUsed
      verificationStatus: SimulationVerificationStatus
      verificationNotes: string[]
      engineVersion: string
    }
  | {
      ok: false
      code:
        | 'UNKNOWN_TRIM'
        | 'MISSING_VEHICLE_PRICE'
        | 'INVALID_CONTRACT_MONTHS'
        | 'UNLIMITED_MILEAGE_CONSULTATION'
        | 'INVALID_RESIDUAL'
        | 'INVALID_RESULT'
      message: string
      verificationStatus: SimulationVerificationStatus
      verificationNotes: string[]
      engineVersion: string
    }
