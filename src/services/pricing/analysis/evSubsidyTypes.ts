/**
 * 전기차 보조금 — 분석 전용 타입.
 * 운영 V4에 자동 반영하지 않음. 확정 혜택으로 표시 금지.
 */

export type SubsidyEligibilityStatus =
  | 'eligible_announced'
  | 'ineligible_confirmed'
  | 'unknown'
  | 'not_applicable'

export type LessorReceiptStatus =
  | 'confirmed_received'
  | 'confirmed_not_received'
  | 'unknown'

/** 0원 확정 vs 미확인 구분 */
export type AmountCertainty =
  | 'confirmed_zero'
  | 'confirmed_positive'
  | 'unverified'
  | 'hypothetical_only'

export interface EvSubsidyAmountField {
  amountWon: number | null
  certainty: AmountCertainty
  note: string
}

/**
 * 보조금 항목별 상태.
 * announced ≠ 월 렌트 전액 반영.
 */
export interface EvSubsidyAssessment {
  modelKey: string
  label: string
  /** EV3 GT ≠ GT-Line — 혼동 금지 */
  isEv3GtPerformanceModel: boolean
  nationalSubsidy: EvSubsidyAmountField
  localSubsidy: EvSubsidyAmountField
  rentalBusinessExtra: EvSubsidyAmountField
  otherVerifiedSupport: EvSubsidyAmountField
  announcedSubsidy: EvSubsidyAmountField
  eligibilityStatus: SubsidyEligibilityStatus
  lessorReceiptStatus: LessorReceiptStatus
  verifiedPassThroughAmount: EvSubsidyAmountField
  hypotheticalPassThroughAmount: EvSubsidyAmountField
  sources: string[]
  asOf: string
  warnings: string[]
}
