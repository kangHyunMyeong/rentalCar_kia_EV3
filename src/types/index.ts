/** 기아 EV3 차량 모델 */
export interface EV3Model {
  id: string
  name: string
  brand: string
  series: string
  description: string
  imagePaths: VehicleImageSet
}

/** Trim Comparison용 등급 */
export type TrimGradeId = 'air' | 'earth' | 'gt-line'

/** Rental Estimate용 트림 (배터리 × 등급) */
export type TrimId =
  | 'STANDARD_AIR'
  | 'STANDARD_EARTH'
  | 'STANDARD_GT_LINE'
  | 'LONG_RANGE_AIR'
  | 'LONG_RANGE_EARTH'
  | 'LONG_RANGE_GT_LINE'

/** 외장 컬러 코드 (Color Studio 전용 상태) */
export type ExteriorColorId =
  | 'ISM'
  | 'ISG'
  | 'SWP'
  | 'AG3'
  | 'EBB'
  | 'EBD'
  | 'ABP'

export interface ExteriorColor {
  id: ExteriorColorId
  code: ExteriorColorId
  name: string
  nameEn: string
  /** 스와치 표시용 */
  swatch: string
  /** 스와치 테두리 (밝은 컬러 대비) */
  swatchBorder?: string
  imageSrc: string
}

/** 견적·상담용 트림 */
export interface RentalTrim {
  id: TrimId
  name: string
  battery: 'standard' | 'long-range'
  grade: TrimGradeId
  available: boolean
  imageKey: 'trimAir' | 'trimEarth' | 'trimGtLine'
  sortOrder: number
}

export interface VehicleOption {
  id: string
  name: string
  category: 'battery' | 'drive' | 'color' | 'package' | 'other'
  description?: string
  availableForTrims: TrimId[]
  incompatibleWith?: string[]
}

export type PrepaymentPercent = 0 | 10 | 20 | 30
export type DepositPercent = 0 | 10 | 20 | 30
/** @deprecated PrepaymentPercent 사용 */
export type PrepaymentRate = PrepaymentPercent
/** @deprecated DepositPercent 사용 */
export type DepositRate = DepositPercent
export type AnnualMileage = 10000 | 15000 | 20000 | 30000 | 'unlimited'
export type ContractMonths = 36 | 48 | 60

export interface RentalCondition {
  id: string
  prepaymentPercents: PrepaymentPercent[]
  depositPercents: DepositPercent[]
  annualMileages: AnnualMileage[]
  contractMonths: ContractMonths[]
  /** 실제 제공되지 않아 비활성 처리되는 조합 */
  disabledCombinations: QuoteCombinationRule[]
  recommended?: Partial<QuoteSelection>
}

export interface QuoteCombinationRule {
  /** 규칙 설명 (UI 비활성 사유) */
  reason: string
  when: Partial<{
    trimId: TrimId
    prepaymentPercent: PrepaymentPercent
    depositPercent: DepositPercent
    annualMileage: AnnualMileage
    contractMonths: ContractMonths
  }>
}

/** 사용자가 선택한 견적 조건 (외장 컬러 제외) */
export interface QuoteSelection {
  trimId: TrimId
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
  annualMileage: AnnualMileage
  contractMonths: ContractMonths
}

export type QuoteResultStatus =
  | 'idle'
  | 'loading'
  | 'available'
  | 'consultationRequired'
  | 'error'
  | 'demo'

export interface QuoteResult {
  status: QuoteResultStatus
  currency: 'KRW'
  /** available/demo일 때만 유효 */
  monthlyRent: number | null
  message: string
  disclaimer: string
  pricingVersionId: string | null
  calculatedAt: string
}

/** 상담 신청 시 첨부하는 시뮬레이션/검증 견적 스냅샷 */
export interface EstimateLeadSnapshot {
  trimId: TrimId
  vehiclePriceBeforeTax: number | null
  prepaymentPercent: PrepaymentPercent
  depositPercent: DepositPercent
  annualMileage: AnnualMileage
  contractMonths: ContractMonths
  estimatedMonthlyFee: number | null
  pricingMode: 'simulation' | 'verified'
  pricingVersion: string | null
  /** simulation 계산값이면 true — 실제 계약 견적 아님 */
  isSimulation: boolean
}

export interface LeadRequest {
  name: string
  phone: string
  privacyConsent: true
  marketingConsent: boolean
  quoteSelection: QuoteSelection
  estimateSnapshot?: EstimateLeadSnapshot
  memo?: string
  source: 'landing-ev3'
}

export interface LeadResponse {
  mode: 'demo' | 'live'
  accepted: boolean
  message: string
  referenceId?: string
}

export interface PricingVersion {
  id: string
  label: string
  effectiveFrom: string
  effectiveTo?: string
  source: 'none' | 'demo' | 'api'
}

export interface VehicleImageSet {
  kvCar: string
  kvCarMobile: string
  kvBg: string
  trimAir: string
  trimEarth: string
  trimGtLine: string
  exterior: string[]
  interior: string[]
}

export interface FeatureItem {
  id: string
  title: string
  description: string
  /** 수치 표시가 필요할 때만. 출처 미확인 시 생략 */
  metric?: {
    value: string
    unit?: string
    note?: string
  }
  imageSrc?: string
  imageAlt: string
}

export interface GallerySlide {
  id: string
  category: 'exterior' | 'interior'
  src: string
  alt: string
  caption: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}
