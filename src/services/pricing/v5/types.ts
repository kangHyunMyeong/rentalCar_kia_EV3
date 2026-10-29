import type { Ev3OptionId } from '@/data/ev3OptionPriceBook'
import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  ExteriorColorId,
  PrepaymentPercent,
  TrimId,
} from '@/types'

export type V5EvidenceKind =
  | 'official_verified'
  | 'partner_verified'
  | 'public_reference'
  | 'internal_assumption'
  | 'unverified'

export type V5EstimateStatus =
  | 'public_reference'
  | 'simulation_assumption'
  | 'needs_verification'
  | 'consultation_required'

export interface V5EstimateInput {
  trimId: TrimId
  contractMonths: ContractMonths
  annualMileage: AnnualMileage
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
  selectedOptionIds?: Ev3OptionId[]
  exteriorColorId?: ExteriorColorId
}

export interface V5AssumptionItem {
  key: string
  value: string | number
  evidence: V5EvidenceKind
  note: string
}

export interface V5RentalEstimate {
  engineVersion: string
  monthlyRental: number
  rawMonthlyRental: number

  baseMarketRate: number
  mileageAdjustment: number
  optionColorMonthlyAdjustment: number
  prepaymentMonthlyReduction: number
  depositMonthlyDiscount: number

  vehiclePriceBeforeTax: number
  prepaymentAmount: number
  depositAmount: number
  totalMonthlyPayments: number
  /** 월액×개월 + 선납 (보증금·만기 인수 미포함) */
  totalRentalExpenditure: number
  initialCashOutlay: number

  contractMonths: ContractMonths
  annualMileage: AnnualMileage
  trimId: TrimId
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent

  pricingBasis: string
  estimateStatus: V5EstimateStatus
  assumptionsRequiringVerification: V5AssumptionItem[]
  warnings: string[]
}

export type V5EstimateResult =
  | { ok: true; estimate: V5RentalEstimate }
  | {
      ok: false
      code:
        | 'UNKNOWN_TRIM'
        | 'MISSING_BASE_RATE'
        | 'MISSING_VEHICLE_PRICE'
        | 'INVALID_CONTRACT_MONTHS'
        | 'UNLIMITED_MILEAGE_CONSULTATION'
        | 'INVALID_OPTIONS'
        | 'INVALID_RESULT'
      message: string
      warnings: string[]
      estimateStatus: V5EstimateStatus
    }
