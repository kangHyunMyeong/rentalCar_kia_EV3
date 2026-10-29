import type { ContractMonths } from '@/types'
import type { SensitivityScenarioMeta } from './sensitivityTypes'

/** STEP 6 잔가 ±5%p 시나리오 — 실제 렌트사 잔가표 아님 */
export const RESIDUAL_SCENARIO_RATES: Record<
  'low' | 'base' | 'high',
  Record<ContractMonths, number>
> = {
  low: { 36: 0.53, 48: 0.46, 60: 0.4 },
  base: { 36: 0.58, 48: 0.51, 60: 0.45 },
  high: { 36: 0.63, 48: 0.56, 60: 0.5 },
}

export const FINANCE_RATE_SCENARIOS = [
  { id: 'finance_4pct', label: '연 금융율 4% (분석용)', rate: 0.04 },
  { id: 'finance_5pct', label: '연 금융율 5% (현재 기준)', rate: 0.05 },
  { id: 'finance_6pct', label: '연 금융율 6% (분석용)', rate: 0.06 },
] as const

export const INSURANCE_SCENARIOS = [
  { id: 'insurance_90k', label: '월 보험 90,000 (분석용)', value: 90_000 },
  { id: 'insurance_120k', label: '월 보험 120,000 (현재 기준)', value: 120_000 },
  { id: 'insurance_150k', label: '월 보험 150,000 (분석용)', value: 150_000 },
] as const

export const MAINTENANCE_SCENARIOS = [
  { id: 'maint_0', label: '월 정비 0 (분석용)', value: 0 },
  { id: 'maint_30k', label: '월 정비 30,000 (현재 기준)', value: 30_000 },
  { id: 'maint_50k', label: '월 정비 50,000 (분석용)', value: 50_000 },
] as const

/** 공통 가상 차감액 — 보조금·확정 혜택 아님 */
export const PRICE_DELTA_AMOUNTS = [
  { key: '0', label: '0원', delta: 0 },
  { key: '1m', label: '100만원', delta: -1_000_000 },
  { key: '3m', label: '300만원', delta: -3_000_000 },
  { key: '5m', label: '500만원', delta: -5_000_000 },
] as const

/** @deprecated STEP 6.1 — buildAcquisitionDiscountOnlyScenarios 사용 */
export const ACQUISITION_DELTA_SCENARIOS = PRICE_DELTA_AMOUNTS.map((s) => ({
  id: `acq_${s.key}`,
  label: `취득원가 가상 차감 ${s.label}`,
  delta: s.delta,
}))

export const PREPAYMENT_PERCENTS = [0, 10, 20, 30] as const
export const CONTRACT_MONTHS: ContractMonths[] = [36, 48, 60]

export function buildVehiclePriceBasisScenarios(): SensitivityScenarioMeta[] {
  return [
    {
      id: 'price_before_tax',
      label: '세제전 차량가격',
      factor: 'vehicle_price_basis',
      assumptionNote:
        'PDF 세제전 트림가. 렌트사 취득원가와 동일하다고 가정하지 않음.',
      overrides: { vehiclePriceBasis: 'beforeTaxBenefit' },
    },
    {
      id: 'price_after_tax',
      label: '세제후 차량가격(트림 표기)',
      factor: 'vehicle_price_basis',
      assumptionNote:
        'PDF 트림별 세제후 표기. 옵션 세제후 미확인 → 기본옵션만 비교. 취득원가 아님.',
      overrides: { vehiclePriceBasis: 'afterTaxBenefit' },
    },
  ]
}

export function buildResidualScenarios(): SensitivityScenarioMeta[] {
  return [
    {
      id: 'residual_low',
      label: '잔가율 −5%p (분석용)',
      factor: 'residual_rate',
      assumptionNote: '민감도용. 실제 렌트사 잔가표 아님.',
      overrides: { residualRateByTerm: { ...RESIDUAL_SCENARIO_RATES.low } },
    },
    {
      id: 'residual_base',
      label: '잔가율 기준 (58/51/45%)',
      factor: 'residual_rate',
      assumptionNote: 'V4 내부 가정 유지.',
      overrides: { residualRateByTerm: { ...RESIDUAL_SCENARIO_RATES.base } },
    },
    {
      id: 'residual_high',
      label: '잔가율 +5%p (분석용)',
      factor: 'residual_rate',
      assumptionNote: '민감도용. 실제 렌트사 잔가표 아님.',
      overrides: { residualRateByTerm: { ...RESIDUAL_SCENARIO_RATES.high } },
    },
  ]
}

export function buildFinanceScenarios(): SensitivityScenarioMeta[] {
  return FINANCE_RATE_SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    factor: 'finance_rate' as const,
    assumptionNote: '분석용 가정. Money Factor·실행금리와 동일하지 않음.',
    overrides: { annualFinanceRate: s.rate },
  }))
}

export function buildInsuranceScenarios(): SensitivityScenarioMeta[] {
  return INSURANCE_SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    factor: 'insurance' as const,
    assumptionNote: '분석용 내부 가정. 공식 렌트사 보험원가 아님.',
    overrides: { monthlyInsurance: s.value },
  }))
}

export function buildMaintenanceScenarios(): SensitivityScenarioMeta[] {
  return MAINTENANCE_SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    factor: 'maintenance' as const,
    assumptionNote: '분석용 내부 가정. Self/포함 상품 미확인.',
    overrides: { monthlyMaintenance: s.value },
  }))
}

/**
 * A. 차량 기준가격(판매가) 변경 — 잔가도 잔가율에 따라 재계산.
 * STEP 6 기존 “취득원가 차감”이 실제로는 이 구조였음.
 */
export function buildVehiclePriceChangeScenarios(): SensitivityScenarioMeta[] {
  return PRICE_DELTA_AMOUNTS.map((s) => ({
    id: `vpc_${s.key}`,
    label: `차량 기준가격 가상 변경 ${s.label}`,
    factor: 'vehicle_price_change' as const,
    assumptionNote:
      '분석용. 판매 기준가를 가감하고 잔가=변경후기준가×잔가율. 공식 할인가·보조금 아님. V4 기본 미반영.',
    overrides: {
      calculationVehiclePriceAdjustment: s.delta,
      priceAdjustmentMode: 'vehicle_price_change',
    },
  }))
}

/**
 * B. 취득원가만 가상 차감 — PDF 판매 기준가·잔가 금액 고정.
 * 실제 렌트사 할인·보조금으로 해석 금지.
 */
export function buildAcquisitionDiscountOnlyScenarios(): SensitivityScenarioMeta[] {
  return PRICE_DELTA_AMOUNTS.map((s) => ({
    id: `acq_only_${s.key}`,
    label: `취득원가만 가상 차감 ${s.label}`,
    factor: 'acquisition_cost_delta' as const,
    assumptionNote:
      '분석용. PDF 판매가·잔가 금액 유지, 취득원가만 차감. 확정 혜택·보조금 아님. V4 기본 미반영.',
    overrides: {
      calculationVehiclePriceAdjustment: s.delta,
      priceAdjustmentMode: 'acquisition_discount_only',
    },
  }))
}

/** STEP 6 호환: 취득원가 할인 = acquisition_discount_only */
export function buildAcquisitionDeltaScenarios(): SensitivityScenarioMeta[] {
  return buildAcquisitionDiscountOnlyScenarios()
}

/** 개별 요인 시나리오 목록 (baseline 제외 변형) */
export function allSingleFactorScenarios(): SensitivityScenarioMeta[] {
  return [
    ...buildVehiclePriceBasisScenarios(),
    ...buildResidualScenarios(),
    ...buildFinanceScenarios(),
    ...buildInsuranceScenarios(),
    ...buildMaintenanceScenarios(),
    ...buildVehiclePriceChangeScenarios(),
    ...buildAcquisitionDiscountOnlyScenarios(),
  ]
}
