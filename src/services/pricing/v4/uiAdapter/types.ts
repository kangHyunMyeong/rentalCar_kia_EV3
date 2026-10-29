import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'
import type { Ev3InteriorId, Ev3OptionId } from '@/data/ev3OptionPriceBook'
import type {
  AnnualMileage,
  ContractMonths,
  DepositPercent,
  ExteriorColorId,
  PrepaymentPercent,
  TrimId,
} from '@/types'
import type { V4EvidenceKind, V4EstimateStatus, V4PrepaymentMode } from '../types'

/** UI 연동 준비용 — 확정 견적 아님 */
export type V4UiEstimateType = 'estimated'

export type V4UiEvidenceStatus =
  | 'official_verified'
  | 'partner_verified'
  | 'internal_assumption'
  | 'unverified'

export interface V4UiAdapterInput {
  trimId: TrimId
  contractMonths: ContractMonths
  annualMileage: AnnualMileage
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
  vehiclePriceBasis?: VehiclePriceBasis
  prepaymentMode?: V4PrepaymentMode
  selectedOptionIds?: Ev3OptionId[]
  exteriorColorId?: ExteriorColorId
  interiorId?: Ev3InteriorId
}

export interface V4UiVehicleBlock {
  trimId: TrimId
  trim: string
  options: Ev3OptionId[]
  exteriorColorId: ExteriorColorId | null
  exteriorColor: string | null
  interiorId: Ev3InteriorId | null
}

export interface V4UiContractBlock {
  months: ContractMonths
  annualMileage: AnnualMileage
  depositPercent: DepositPercent
  prepaymentPercent: PrepaymentPercent
}

export interface V4UiPricingBlock {
  /** 계산에 사용한 차량 기준가(옵션·색상 반영) */
  vehiclePrice: number
  vehiclePriceBasis: VehiclePriceBasis
  monthlyRent: number
  prepaymentAmount: number
  depositAmount: number
  /** 월액×개월 + 선납 (보증금·만기 인수대금 미포함) */
  totalPayment: number
  totalMonthlyPayments: number
  initialCashOutlay: number
  residualValue: number
  residualRate: number
}

/**
 * 항목별 월 비용.
 * null = 미확인으로 0원 확정하지 않음 (현재 V4는 대부분 숫자 산출).
 */
export interface V4UiBreakdownBlock {
  depreciation: number
  financing: number
  insurance: number
  vehicleTax: number
  maintenance: number
  otherOperating: number | null
  depositDiscount: number
  verifiedPromotion: number | null
  residualValue: number
  financedCapital: number
}

export interface V4UiEvidenceBlock {
  vehiclePrice: V4UiEvidenceStatus
  residual: V4UiEvidenceStatus
  financing: V4UiEvidenceStatus
  insurance: V4UiEvidenceStatus
  maintenance: V4UiEvidenceStatus
  vehicleTax: V4UiEvidenceStatus
  acquisitionCost: V4UiEvidenceStatus
  subsidy: V4UiEvidenceStatus
  promotion: V4UiEvidenceStatus
}

export type V4UiDiagnosticCode =
  | 'financed_capital_below_residual'
  | 'negative_depreciation'
  | 'negative_monthly_rent'
  | 'suspiciously_low_monthly'
  | 'invalid_numeric_result'
  | 'unlimited_mileage'
  | 'invalid_options'
  | 'calculation_failed'
  | 'needs_verification_flag'

export interface V4UiDiagnostic {
  code: V4UiDiagnosticCode
  message: string
  /** 운영 UI 표시 여부는 후속 승인 후 결정 */
  displayDeferred: true
}

export interface V4UiValidationBlock {
  isValid: boolean
  requiresReview: boolean
  warnings: string[]
  diagnostics: V4UiDiagnostic[]
  estimateStatus: V4EstimateStatus | 'unavailable'
}

export interface V4UiEstimateViewModel {
  estimateType: V4UiEstimateType
  engineVersion: string
  /** 항상 숫자 노출이 목표. 실패 시에만 null */
  monthlyRentDisplay: number | null
  monthlyRentFormatted: string | null
  vehicle: V4UiVehicleBlock
  contract: V4UiContractBlock
  pricing: V4UiPricingBlock | null
  breakdown: V4UiBreakdownBlock | null
  evidence: V4UiEvidenceBlock
  validation: V4UiValidationBlock
  /** 추후 UI 문구 키 — 실제 UI 미적용 */
  copyKeys: {
    title: 'estimated_monthly_rent'
    disclaimer: 'estimated_not_final'
    cta: 'free_custom_consult'
  }
}

export interface V4UiAdapterResult {
  ok: boolean
  viewModel: V4UiEstimateViewModel
  /** 원본 V4 결과 참조(디버그·테스트용) */
  sourceOk: boolean
  sourceCode?: string
}

export type { V4EvidenceKind }
