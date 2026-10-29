import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'
import type { AnnualMileage, ContractMonths } from '@/types'
import type {
  V4EstimateInput,
  V4PrepaymentMode,
  V4RentalEstimate,
} from '../v4/types'

/** 분석용 설정 스냅샷 — V4 기본 설정의 복사본. 원본 불변. */
export interface SensitivityConfigSnapshot {
  residualRateByTerm: Record<ContractMonths, number>
  annualFinanceRateByTerm: Record<ContractMonths, number>
  mileageResidualAdjustment: Record<
    Exclude<AnnualMileage, 'unlimited'> | 'unlimited',
    number
  >
  monthlyInsurance: number
  monthlyVehicleTax: number
  monthlyMaintenance: number
  monthlyOtherOperating: number
  depositAnnualDiscountRate: number
  verifiedPromotionMonthly: number
  suspiciouslyLowMonthly: number
  vatTreatment: string
  subsidyTreatment: string
}

/**
 * 가격 조정 모드 (분석 전용 — V4 기본 엔진 미사용).
 *
 * - vehicle_price_change: PDF/판매 기준가 자체를 가감. 잔가도 잔가율×변경후 기준가로 재계산.
 * - acquisition_discount_only: PDF 판매 기준가·잔가 금액 고정. 취득원가만 가상 차감.
 */
export type PriceAdjustmentMode =
  | 'vehicle_price_change'
  | 'acquisition_discount_only'

/** 선납·보증 %의 기준 금액 */
export type PrepaymentDepositBasis =
  | 'list_sale_price'
  | 'acquisition_cost'

/**
 * 시나리오별 일시 덮어쓰기.
 * 운영 V4 config·기본 계산식에는 기록되지 않음.
 */
export interface SensitivityOverrides {
  residualRateByTerm?: Partial<Record<ContractMonths, number>>
  /** 전 기간 동일 연 금융율로 덮어씀 (분석용) */
  annualFinanceRate?: number
  annualFinanceRateByTerm?: Partial<Record<ContractMonths, number>>
  monthlyInsurance?: number
  monthlyMaintenance?: number
  monthlyVehicleTax?: number
  depositAnnualDiscountRate?: number
  vehiclePriceBasis?: VehiclePriceBasis
  prepaymentMode?: V4PrepaymentMode
  /**
   * 가격 가감액(원). 음수 = 인하.
   * 실제 보조금·제조사 할인·확정 혜택이 아님.
   * priceAdjustmentMode와 함께 해석한다.
   */
  calculationVehiclePriceAdjustment?: number
  /**
   * 미지정 + adjustment만 있으면 하위호환으로 vehicle_price_change.
   * STEP 6.1부터 취득원가 할인은 acquisition_discount_only를 명시한다.
   */
  priceAdjustmentMode?: PriceAdjustmentMode
}

export type SensitivityFactor =
  | 'baseline'
  | 'vehicle_price_basis'
  | 'residual_rate'
  | 'finance_rate'
  | 'insurance'
  | 'maintenance'
  | 'acquisition_cost_delta'
  | 'vehicle_price_change'
  | 'prepayment'
  | 'combined'

export interface SensitivityScenarioMeta {
  id: string
  label: string
  factor: SensitivityFactor
  /** 분석용 가정 설명 — 공식 요율 아님 */
  assumptionNote: string
  overrides: SensitivityOverrides
}

export interface SensitivityRunInput extends V4EstimateInput {
  /** 시나리오 id (리포트용) */
  scenarioId?: string
}

export interface SensitivityEstimateMetrics {
  monthlyRental: number
  rawMonthlyRental: number
  /**
   * 하위호환: 감가·금융에 쓰는 자본 기준가.
   * vehicle_price_change → 변경된 판매가
   * acquisition_discount_only → 취득원가
   */
  calculationVehiclePrice: number
  /** PDF 등 판매 기준가(옵션·색상 반영). acquisition_discount_only에서 고정 */
  listVehiclePrice: number
  /** 분석용 취득원가. 할인이 없으면 list와 동일 */
  acquisitionCost: number
  residualRate: number
  residualValue: number
  /** 잔가 산출에 사용한 기준 금액 */
  residualPriceBasisAmount: number
  financedCapital: number
  monthlyDepreciation: number
  monthlyFinance: number
  monthlyOperatingCost: number
  monthlyInsuranceCost: number
  monthlyMaintenanceCost: number
  monthlyVehicleTax: number
  monthlyDepositDiscount: number
  prepaymentAmount: number
  depositAmount: number
  /** 선납·보증 % 적용 기준 */
  prepaymentDepositBasis: PrepaymentDepositBasis
  priceAdjustmentMode: PriceAdjustmentMode
  totalMonthlyPayments: number
  totalRentalExpenditure: number
  initialCashOutlay: number
  warnings: string[]
  vehiclePriceBasis: VehiclePriceBasis
  prepaymentMode: V4PrepaymentMode
}

export interface SensitivityDeltaVsBaseline {
  monthlyRentalDelta: number
  totalRentalExpenditureDelta: number
  monthlyDepreciationDelta: number
  monthlyFinanceDelta: number
}

export interface SensitivityRunResult {
  ok: true
  scenarioId: string
  factor: SensitivityFactor
  assumptionNote: string
  appliedOverrides: SensitivityOverrides
  configUsed: SensitivityConfigSnapshot
  metrics: SensitivityEstimateMetrics
  /** 동일 입력·기본 설정 V4와의 차이 (시나리오 비교 시) */
  deltaVsBaseline: SensitivityDeltaVsBaseline | null
  /** 엔진 정합: overrides 없을 때 V4 원본과 일치 여부 */
  matchesDefaultV4: boolean | null
  v4Estimate?: V4RentalEstimate
}

export type SensitivityResult =
  | SensitivityRunResult
  | {
      ok: false
      scenarioId: string
      message: string
      warnings: string[]
    }

export interface FactorImpactRankRow {
  factor: SensitivityFactor
  label: string
  /** |월액 변화| 최대(절대값) — 대표 조건 기준 */
  absMonthlyImpact: number
  monthlyDeltaLow: number
  monthlyDeltaHigh: number
  verificationStatus: 'official_verified' | 'internal_assumption' | 'unverified'
}
