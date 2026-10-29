import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  ExteriorColorId,
  PrepaymentPercent,
  TrimId,
} from '@/types'
import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'
import type { Ev3InteriorId, Ev3OptionId } from '@/data/ev3OptionPriceBook'

export type V4PrepaymentMode = 'capital_reduction' | 'flat_pn'
export type V4MileageMode = 'residual_adjustment' | 'flat_monthly_delta'

export type V4EvidenceKind =
  | 'official_verified'
  | 'partner_verified'
  | 'internal_assumption'
  | 'unverified'

export type V4EstimateStatus = 'simulation_assumption' | 'needs_verification'

export interface V4EstimateInput {
  trimId: TrimId
  contractMonths: ContractMonths
  annualMileage: AnnualMileage
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
  vehiclePriceBasis?: VehiclePriceBasis
  prepaymentMode?: V4PrepaymentMode
  mileageMode?: V4MileageMode
  selectedOptionIds?: Ev3OptionId[]
  exteriorColorId?: ExteriorColorId
  interiorId?: Ev3InteriorId
}

export interface V4AssumptionRecord {
  key: string
  value: string | number
  evidence: V4EvidenceKind
  note: string
}

export interface V4RentalEstimate {
  engineVersion: string
  monthlyRental: number
  rawMonthlyRental: number

  selectedTrim: TrimId
  vehiclePriceBeforeTax: number
  vehiclePriceAfterTaxBenefit: number
  vehiclePriceBasis: VehiclePriceBasis
  calculationVehiclePrice: number
  lessorAcquisitionCost: number | null
  optionsBeforeTaxTotal: number
  exteriorColorPriceBeforeTax: number

  contractMonths: number
  annualMileage: AnnualMileage | 'unlimited'

  prepaymentRate: number
  prepaymentAmount: number
  prepaymentMode: V4PrepaymentMode

  depositRate: number
  depositAmount: number

  residualValue: number
  residualRate: number
  residualPriceBasisAmount: number

  financedCapital: number
  monthlyDepreciation: number
  monthlyFinance: number
  monthlyInsuranceCost: number
  monthlyVehicleTax: number
  monthlyMaintenanceCost: number
  monthlyOtherOperatingCost: number
  monthlyOperatingCost: number
  monthlyDepositDiscount: number
  verifiedPromotionDiscount: number
  flatPnMonthlyReduction: number

  totalMonthlyPayments: number
  totalRentalExpenditure: number
  initialCashOutlay: number

  subsidyTreatment: 'unconfirmed_not_applied'
  vatTreatment: string

  estimateStatus: V4EstimateStatus
  warnings: string[]
  assumptions: V4AssumptionRecord[]
}

export type V4EstimateResult =
  | { ok: true; estimate: V4RentalEstimate }
  | {
      ok: false
      code:
        | 'UNKNOWN_TRIM'
        | 'MISSING_VEHICLE_PRICE'
        | 'INVALID_CONTRACT_MONTHS'
        | 'UNLIMITED_MILEAGE_CONSULTATION'
        | 'INVALID_RESIDUAL'
        | 'INVALID_OPTIONS'
        | 'INVALID_RESULT'
      message: string
      warnings: string[]
      estimateStatus: V4EstimateStatus
    }
