import { DEFAULT_VEHICLE_PRICE_BASIS } from '@/data/pricingSimulationConfig'
import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'
import type { ContractMonths } from '@/types'
import {
  V4_ANNUAL_FINANCE_RATE_BY_TERM,
  V4_DEPOSIT_ANNUAL_DISCOUNT_RATE,
  V4_MILEAGE_RESIDUAL_ADJUSTMENT,
  V4_MONTHLY_INSURANCE,
  V4_MONTHLY_MAINTENANCE,
  V4_MONTHLY_OTHER_OPERATING,
  V4_MONTHLY_VEHICLE_TAX,
  V4_RESIDUAL_RATE_BY_TERM,
  V4_SUBSIDY_TREATMENT,
  V4_SUSPICIOUSLY_LOW_MONTHLY,
  V4_VAT_TREATMENT,
  V4_VERIFIED_PROMOTION_MONTHLY,
} from '../v4/config'
import {
  calculateV4RentalEstimate,
  roundV4MonthlyRent,
} from '../v4/calculator'
import { resolveV4VehiclePrice } from '../v4/vehiclePrice'
import type { V4EstimateInput, V4PrepaymentMode } from '../v4/types'
import type {
  FactorImpactRankRow,
  PrepaymentDepositBasis,
  PriceAdjustmentMode,
  SensitivityConfigSnapshot,
  SensitivityEstimateMetrics,
  SensitivityOverrides,
  SensitivityResult,
  SensitivityRunResult,
  SensitivityScenarioMeta,
} from './sensitivityTypes'
import {
  allSingleFactorScenarios,
  buildAcquisitionDiscountOnlyScenarios,
  buildVehiclePriceChangeScenarios,
  CONTRACT_MONTHS,
  PREPAYMENT_PERCENTS,
  PRICE_DELTA_AMOUNTS,
} from './sensitivityScenarios'
import {
  compareV4ToLotteReference as compareSingleLotteRow,
  LOTTE_OBSERVED_QUOTES,
} from '../validation/lotteComparison'

function cloneSnapshot(
  snap: SensitivityConfigSnapshot,
): SensitivityConfigSnapshot {
  return {
    residualRateByTerm: { ...snap.residualRateByTerm },
    annualFinanceRateByTerm: { ...snap.annualFinanceRateByTerm },
    mileageResidualAdjustment: { ...snap.mileageResidualAdjustment },
    monthlyInsurance: snap.monthlyInsurance,
    monthlyVehicleTax: snap.monthlyVehicleTax,
    monthlyMaintenance: snap.monthlyMaintenance,
    monthlyOtherOperating: snap.monthlyOtherOperating,
    depositAnnualDiscountRate: snap.depositAnnualDiscountRate,
    verifiedPromotionMonthly: snap.verifiedPromotionMonthly,
    suspiciouslyLowMonthly: snap.suspiciouslyLowMonthly,
    vatTreatment: snap.vatTreatment,
    subsidyTreatment: snap.subsidyTreatment,
  }
}

/** V4 기본 설정의 불변 스냅샷 (원본 모듈 상수를 변경하지 않음) */
export function snapshotDefaultV4Config(): SensitivityConfigSnapshot {
  return {
    residualRateByTerm: { ...V4_RESIDUAL_RATE_BY_TERM.value },
    annualFinanceRateByTerm: { ...V4_ANNUAL_FINANCE_RATE_BY_TERM.value },
    mileageResidualAdjustment: { ...V4_MILEAGE_RESIDUAL_ADJUSTMENT.value },
    monthlyInsurance: V4_MONTHLY_INSURANCE.value,
    monthlyVehicleTax: V4_MONTHLY_VEHICLE_TAX.value,
    monthlyMaintenance: V4_MONTHLY_MAINTENANCE.value,
    monthlyOtherOperating: V4_MONTHLY_OTHER_OPERATING.value,
    depositAnnualDiscountRate: V4_DEPOSIT_ANNUAL_DISCOUNT_RATE.value,
    verifiedPromotionMonthly: V4_VERIFIED_PROMOTION_MONTHLY.value,
    suspiciouslyLowMonthly: V4_SUSPICIOUSLY_LOW_MONTHLY,
    vatTreatment: V4_VAT_TREATMENT.value,
    subsidyTreatment: V4_SUBSIDY_TREATMENT.value,
  }
}

export function applySensitivityOverrides(
  base: SensitivityConfigSnapshot,
  overrides: SensitivityOverrides,
): SensitivityConfigSnapshot {
  const next = cloneSnapshot(base)
  if (overrides.residualRateByTerm) {
    next.residualRateByTerm = {
      ...next.residualRateByTerm,
      ...overrides.residualRateByTerm,
    }
  }
  if (overrides.annualFinanceRate !== undefined) {
    next.annualFinanceRateByTerm = {
      36: overrides.annualFinanceRate,
      48: overrides.annualFinanceRate,
      60: overrides.annualFinanceRate,
    }
  }
  if (overrides.annualFinanceRateByTerm) {
    next.annualFinanceRateByTerm = {
      ...next.annualFinanceRateByTerm,
      ...overrides.annualFinanceRateByTerm,
    }
  }
  if (overrides.monthlyInsurance !== undefined) {
    next.monthlyInsurance = overrides.monthlyInsurance
  }
  if (overrides.monthlyMaintenance !== undefined) {
    next.monthlyMaintenance = overrides.monthlyMaintenance
  }
  if (overrides.monthlyVehicleTax !== undefined) {
    next.monthlyVehicleTax = overrides.monthlyVehicleTax
  }
  if (overrides.depositAnnualDiscountRate !== undefined) {
    next.depositAnnualDiscountRate = overrides.depositAnnualDiscountRate
  }
  return next
}

function toMetrics(
  args: SensitivityEstimateMetrics,
): SensitivityEstimateMetrics {
  return { ...args }
}

/**
 * V4와 동일 산식 + 복사된 설정 스냅샷.
 * 원본 V4 config·calculateV4RentalEstimate 기본 경로를 변경하지 않음.
 */
export function calculateWithConfigSnapshot(
  input: V4EstimateInput,
  config: SensitivityConfigSnapshot,
  extras?: {
    calculationVehiclePriceAdjustment?: number
    priceAdjustmentMode?: PriceAdjustmentMode
    vehiclePriceBasis?: VehiclePriceBasis
    prepaymentMode?: V4PrepaymentMode
  },
): SensitivityResult {
  const warnings: string[] = []
  const priceBasis =
    extras?.vehiclePriceBasis ??
    input.vehiclePriceBasis ??
    DEFAULT_VEHICLE_PRICE_BASIS
  const prepaymentMode: V4PrepaymentMode =
    extras?.prepaymentMode ?? input.prepaymentMode ?? 'capital_reduction'
  const mileageMode = input.mileageMode ?? 'residual_adjustment'

  const priced = resolveV4VehiclePrice({
    trimId: input.trimId,
    vehiclePriceBasis: priceBasis,
    selectedOptionIds: input.selectedOptionIds,
    exteriorColorId: input.exteriorColorId,
    interiorId: input.interiorId,
  })
  if (!priced.ok) {
    return {
      ok: false,
      scenarioId: 'n/a',
      message: priced.message,
      warnings: priced.warnings,
    }
  }

  warnings.push(...priced.breakdown.warnings)
  const adj = extras?.calculationVehiclePriceAdjustment ?? 0
  const priceAdjustmentMode: PriceAdjustmentMode =
    extras?.priceAdjustmentMode ?? 'vehicle_price_change'

  /** PDF 등 해석된 판매 기준가(옵션·색상 포함) — 데이터 원본 불변 */
  const pdfListVehiclePrice = priced.breakdown.calculationVehiclePrice

  let listVehiclePrice: number
  let acquisitionCost: number
  let residualPriceBasisAmount: number
  let prepaymentDepositBasis: PrepaymentDepositBasis
  let capitalForDepreciationFinance: number

  if (priceAdjustmentMode === 'acquisition_discount_only') {
    // B: 판매 기준가·잔가 고정, 취득원가만 가상 차감
    listVehiclePrice = pdfListVehiclePrice
    acquisitionCost = pdfListVehiclePrice + adj
    residualPriceBasisAmount = listVehiclePrice
    prepaymentDepositBasis = 'list_sale_price'
    capitalForDepreciationFinance = acquisitionCost
    if (adj !== 0) {
      warnings.push(
        `analysis_acquisition_discount_only=${adj} — PDF 판매가·잔가 고정, 취득원가만 차감. 확정 혜택·보조금 아님`,
      )
    }
  } else {
    // A: 판매 기준가 변경 → 잔가도 재계산 (STEP 6 기존 결합 구조)
    listVehiclePrice = pdfListVehiclePrice + adj
    acquisitionCost = listVehiclePrice
    residualPriceBasisAmount = listVehiclePrice
    prepaymentDepositBasis = 'list_sale_price'
    capitalForDepreciationFinance = listVehiclePrice
    if (adj !== 0) {
      warnings.push(
        `analysis_vehicle_price_change=${adj} — 판매 기준가 변경, 잔가=변경후기준가×잔가율. 공식 할인가 아님`,
      )
    }
  }

  const calculationVehiclePrice = capitalForDepreciationFinance
  if (listVehiclePrice <= 0 || acquisitionCost <= 0) {
    return {
      ok: false,
      scenarioId: 'n/a',
      message: '계산 기준 차량가격이 0 이하',
      warnings,
    }
  }

  const N = input.contractMonths
  if (N !== 36 && N !== 48 && N !== 60) {
    return {
      ok: false,
      scenarioId: 'n/a',
      message: '계약기간 오류',
      warnings,
    }
  }
  if (input.annualMileage === 'unlimited') {
    return {
      ok: false,
      scenarioId: 'n/a',
      message: '무제한 주행 미지원',
      warnings,
    }
  }

  let residualRate = config.residualRateByTerm[N]
  if (mileageMode === 'residual_adjustment') {
    residualRate += config.mileageResidualAdjustment[input.annualMileage]
  } else {
    warnings.push('mileage_mode_flat_monthly_delta — 분석기에서는 잔가 가감 미적용')
  }

  if (!Number.isFinite(residualRate) || residualRate <= 0 || residualRate >= 1) {
    return {
      ok: false,
      scenarioId: 'n/a',
      message: `잔존가치율 오류: ${residualRate}`,
      warnings,
    }
  }

  const residualValue = residualPriceBasisAmount * residualRate
  /** 선납·보증: 판매 기준가(list) % — 취득원가와 분리 */
  const prepaymentAmount =
    listVehiclePrice * (input.prepaymentPercent / 100)
  const depositAmount = listVehiclePrice * (input.depositPercent / 100)
  const financedCapital = capitalForDepreciationFinance - prepaymentAmount
  const annualFinanceRate = config.annualFinanceRateByTerm[N]

  let monthlyDepreciation: number
  let monthlyFinance: number
  let flatPnMonthlyReduction = 0

  if (prepaymentMode === 'capital_reduction') {
    monthlyDepreciation = (financedCapital - residualValue) / N
    monthlyFinance =
      ((financedCapital + residualValue) / 2) * (annualFinanceRate / 12)
  } else {
    monthlyDepreciation =
      (capitalForDepreciationFinance - residualValue) / N
    monthlyFinance =
      ((capitalForDepreciationFinance + residualValue) / 2) *
      (annualFinanceRate / 12)
    flatPnMonthlyReduction = prepaymentAmount / N
  }

  if (financedCapital < residualValue && prepaymentMode === 'capital_reduction') {
    warnings.push(
      `negative_or_thin_depreciation_risk: financedCapital < residual`,
    )
  }
  if (monthlyDepreciation < 0) {
    warnings.push(
      `negative_monthly_depreciation=${monthlyDepreciation} — 임의 0원 보정 없음`,
    )
  }

  const monthlyInsuranceCost = config.monthlyInsurance
  const monthlyVehicleTax = config.monthlyVehicleTax
  const monthlyMaintenanceCost = config.monthlyMaintenance
  const monthlyOtherOperatingCost = config.monthlyOtherOperating
  const monthlyOperatingCost =
    monthlyInsuranceCost +
    monthlyVehicleTax +
    monthlyMaintenanceCost +
    monthlyOtherOperatingCost

  const monthlyDepositDiscount =
    depositAmount * (config.depositAnnualDiscountRate / 12)
  const verifiedPromotionDiscount = config.verifiedPromotionMonthly

  const rawMonthlyRental =
    monthlyDepreciation +
    monthlyFinance +
    monthlyOperatingCost -
    monthlyDepositDiscount -
    verifiedPromotionDiscount -
    flatPnMonthlyReduction

  if (!Number.isFinite(rawMonthlyRental)) {
    return {
      ok: false,
      scenarioId: 'n/a',
      message: 'NaN/Infinity',
      warnings,
    }
  }
  if (rawMonthlyRental < 0) {
    warnings.push(`negative_raw_monthly=${rawMonthlyRental}`)
  }

  const monthlyRental = roundV4MonthlyRent(rawMonthlyRental)
  if (monthlyRental < config.suspiciouslyLowMonthly) {
    warnings.push(
      `suspiciously_low_monthly=${monthlyRental} < ${config.suspiciouslyLowMonthly}`,
    )
  }

  // VAT: 설정상 포함 가정·추가 ×1.1 없음 — 이중 부가세 미적용 확인
  if (config.vatTreatment.includes('no_extra_multiplier') === false) {
    warnings.push('vat_treatment_unexpected')
  }

  const totalMonthlyPayments = monthlyRental * N
  const metrics = toMetrics({
    monthlyRental,
    rawMonthlyRental,
    calculationVehiclePrice,
    listVehiclePrice,
    acquisitionCost,
    residualRate,
    residualValue,
    residualPriceBasisAmount,
    financedCapital,
    monthlyDepreciation,
    monthlyFinance,
    monthlyOperatingCost,
    monthlyInsuranceCost,
    monthlyMaintenanceCost,
    monthlyVehicleTax,
    monthlyDepositDiscount,
    prepaymentAmount,
    depositAmount,
    prepaymentDepositBasis,
    priceAdjustmentMode,
    totalMonthlyPayments,
    totalRentalExpenditure: totalMonthlyPayments + prepaymentAmount,
    initialCashOutlay: prepaymentAmount + depositAmount,
    warnings,
    vehiclePriceBasis: priceBasis,
    prepaymentMode,
  })

  return {
    ok: true,
    scenarioId: 'custom',
    factor: 'baseline',
    assumptionNote: 'config snapshot run',
    appliedOverrides: {},
    configUsed: cloneSnapshot(config),
    metrics,
    deltaVsBaseline: null,
    matchesDefaultV4: null,
  }
}

export function runSensitivityScenario(
  input: V4EstimateInput,
  scenario: SensitivityScenarioMeta,
  baselineMetrics?: SensitivityEstimateMetrics,
): SensitivityResult {
  const defaultSnap = snapshotDefaultV4Config()
  const config = applySensitivityOverrides(defaultSnap, scenario.overrides)
  const result = calculateWithConfigSnapshot(input, config, {
    calculationVehiclePriceAdjustment:
      scenario.overrides.calculationVehiclePriceAdjustment,
    priceAdjustmentMode: scenario.overrides.priceAdjustmentMode,
    vehiclePriceBasis: scenario.overrides.vehiclePriceBasis,
    prepaymentMode: scenario.overrides.prepaymentMode,
  })

  if (!result.ok) {
    return { ...result, scenarioId: scenario.id }
  }

  let matchesDefaultV4: boolean | null = null
  const configMatchesDefault =
    JSON.stringify(config) === JSON.stringify(defaultSnap)
  const adj = scenario.overrides.calculationVehiclePriceAdjustment ?? 0
  const basisOverride = scenario.overrides.vehiclePriceBasis
  const modeOverride = scenario.overrides.prepaymentMode
  if (configMatchesDefault && adj === 0) {
    const v4 = calculateV4RentalEstimate({
      ...input,
      vehiclePriceBasis: basisOverride ?? input.vehiclePriceBasis,
      prepaymentMode: modeOverride ?? input.prepaymentMode,
    })
    if (v4.ok) {
      matchesDefaultV4 =
        v4.estimate.monthlyRental === result.metrics.monthlyRental &&
        Math.abs(
          v4.estimate.monthlyDepreciation - result.metrics.monthlyDepreciation,
        ) < 0.01
    }
  }

  let deltaVsBaseline = null
  const base = baselineMetrics
  if (base) {
    deltaVsBaseline = {
      monthlyRentalDelta: result.metrics.monthlyRental - base.monthlyRental,
      totalRentalExpenditureDelta:
        result.metrics.totalRentalExpenditure - base.totalRentalExpenditure,
      monthlyDepreciationDelta:
        result.metrics.monthlyDepreciation - base.monthlyDepreciation,
      monthlyFinanceDelta:
        result.metrics.monthlyFinance - base.monthlyFinance,
    }
  }

  const out: SensitivityRunResult = {
    ok: true,
    scenarioId: scenario.id,
    factor: scenario.factor,
    assumptionNote: scenario.assumptionNote,
    appliedOverrides: { ...scenario.overrides },
    configUsed: result.configUsed,
    metrics: result.metrics,
    deltaVsBaseline,
    matchesDefaultV4,
  }
  return out
}

/** 기본 설정으로 분석기 실행 — V4와 동일해야 함 */
export function runBaselineSensitivity(
  input: V4EstimateInput,
): SensitivityResult {
  return runSensitivityScenario(input, {
    id: 'baseline',
    label: 'V4 기본',
    factor: 'baseline',
    assumptionNote: 'V4 기본 설정 스냅샷',
    overrides: {},
  })
}

export function assertDefaultV4Unchanged(
  input: V4EstimateInput,
): { ok: true; monthlyRental: number } | { ok: false; message: string } {
  const before = calculateV4RentalEstimate(input)
  const snap = snapshotDefaultV4Config()
  // 스냅샷 변조 시도가 원본에 영향 없는지 확인
  const mutated = applySensitivityOverrides(snap, {
    residualRateByTerm: { 36: 0.99 },
    annualFinanceRate: 0.99,
    monthlyInsurance: 1,
  })
  void mutated
  const after = calculateV4RentalEstimate(input)
  if (!before.ok || !after.ok) {
    return { ok: false, message: 'V4 계산 실패' }
  }
  if (before.estimate.monthlyRental !== after.estimate.monthlyRental) {
    return { ok: false, message: '민감도 설정 조작 후 V4 월액 변경됨' }
  }
  if (V4_RESIDUAL_RATE_BY_TERM.value[36] !== 0.58) {
    return { ok: false, message: 'V4 잔가율 원본 변조됨' }
  }
  if (V4_MONTHLY_INSURANCE.value !== 120_000) {
    return { ok: false, message: 'V4 보험 원본 변조됨' }
  }
  return { ok: true, monthlyRental: after.estimate.monthlyRental }
}

export interface PrepayMatrixCell {
  trimId: string
  contractMonths: ContractMonths
  prepaymentPercent: number
  capitalReduction: SensitivityEstimateMetrics
  flatPn: SensitivityEstimateMetrics
  termOrderNote?: string
}

export function buildPrepaymentMatrix(
  trimId: V4EstimateInput['trimId'],
): PrepayMatrixCell[] {
  const cells: PrepayMatrixCell[] = []
  for (const prepaymentPercent of PREPAYMENT_PERCENTS) {
    for (const contractMonths of CONTRACT_MONTHS) {
      const baseInput: V4EstimateInput = {
        trimId,
        contractMonths,
        annualMileage: 20_000,
        prepaymentPercent,
        depositPercent: 0,
      }
      const cr = calculateWithConfigSnapshot(
        { ...baseInput, prepaymentMode: 'capital_reduction' },
        snapshotDefaultV4Config(),
        { prepaymentMode: 'capital_reduction' },
      )
      const flat = calculateWithConfigSnapshot(
        { ...baseInput, prepaymentMode: 'flat_pn' },
        snapshotDefaultV4Config(),
        { prepaymentMode: 'flat_pn' },
      )
      if (!cr.ok || !flat.ok) continue
      cells.push({
        trimId,
        contractMonths,
        prepaymentPercent,
        capitalReduction: cr.metrics,
        flatPn: flat.metrics,
      })
    }
  }
  return cells
}

export function analyzeTermOrder(
  trimId: V4EstimateInput['trimId'],
  prepaymentPercent: V4EstimateInput['prepaymentPercent'],
): {
  months: ContractMonths[]
  monthlies: number[]
  inverted: boolean
  note: string
} {
  const monthlies = CONTRACT_MONTHS.map((contractMonths) => {
    const r = calculateV4RentalEstimate({
      trimId,
      contractMonths,
      annualMileage: 20_000,
      prepaymentPercent,
      depositPercent: 0,
    })
    return r.ok ? r.estimate.monthlyRental : NaN
  })
  const inverted = !(monthlies[0] > monthlies[1] && monthlies[1] > monthlies[2])
  return {
    months: [...CONTRACT_MONTHS],
    monthlies,
    inverted,
    note: inverted
      ? '기간 역전 관찰 — 고선납·잔가·금융 구조상 가능. 강제 정렬 없음.'
      : '36>48>60 월액 순서 유지',
  }
}

export function rankFactorImpacts(
  input: V4EstimateInput,
): FactorImpactRankRow[] {
  const baseline = runBaselineSensitivity(input)
  if (!baseline.ok) return []
  const base = baseline.metrics.monthlyRental

  const groups: {
    factor: FactorImpactRankRow['factor']
    label: string
    status: FactorImpactRankRow['verificationStatus']
    scenarios: SensitivityScenarioMeta[]
  }[] = [
    {
      factor: 'vehicle_price_basis',
      label: '차량가격 기준(세제전/후)',
      status: 'official_verified',
      scenarios: allSingleFactorScenarios().filter(
        (s) => s.factor === 'vehicle_price_basis',
      ),
    },
    {
      factor: 'residual_rate',
      label: '잔존가치율 ±5%p',
      status: 'internal_assumption',
      scenarios: allSingleFactorScenarios().filter(
        (s) => s.factor === 'residual_rate',
      ),
    },
    {
      factor: 'finance_rate',
      label: '연 금융율 4~6%',
      status: 'internal_assumption',
      scenarios: allSingleFactorScenarios().filter(
        (s) => s.factor === 'finance_rate',
      ),
    },
    {
      factor: 'insurance',
      label: '월 보험료',
      status: 'internal_assumption',
      scenarios: allSingleFactorScenarios().filter(
        (s) => s.factor === 'insurance',
      ),
    },
    {
      factor: 'maintenance',
      label: '월 정비비',
      status: 'internal_assumption',
      scenarios: allSingleFactorScenarios().filter(
        (s) => s.factor === 'maintenance',
      ),
    },
    {
      factor: 'vehicle_price_change',
      label: '차량 기준가격 변경(잔가 동반)',
      status: 'unverified',
      scenarios: allSingleFactorScenarios().filter(
        (s) => s.factor === 'vehicle_price_change',
      ),
    },
    {
      factor: 'acquisition_cost_delta',
      label: '취득원가만 차감(잔가 고정)',
      status: 'unverified',
      scenarios: allSingleFactorScenarios().filter(
        (s) => s.factor === 'acquisition_cost_delta',
      ),
    },
  ]

  return groups.map((g) => {
    const rents = g.scenarios
      .map((s) => runSensitivityScenario(input, s, baseline.metrics))
      .filter((r): r is SensitivityRunResult => r.ok)
      .map((r) => r.metrics.monthlyRental)
    const low = Math.min(...rents, base)
    const high = Math.max(...rents, base)
    return {
      factor: g.factor,
      label: g.label,
      absMonthlyImpact: high - low,
      monthlyDeltaLow: low - base,
      monthlyDeltaHigh: high - base,
      verificationStatus: g.status,
    }
  }).sort((a, b) => b.absMonthlyImpact - a.absMonthlyImpact)
}

/** 롯데 참고 비교 — V4 입력으로 사용하지 않음 (사후 비교만) */
export function buildLotteReferenceComparisonTable() {
  const rows = LOTTE_OBSERVED_QUOTES.map((q) => {
    const v4 = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: q.contractMonths,
      annualMileage: 20_000,
      prepaymentPercent: q.prepaymentPercent,
      depositPercent: 0,
    })
    const v4Monthly = v4.ok ? v4.estimate.monthlyRental : NaN
    return compareSingleLotteRow({
      trimId: q.trimId,
      contractMonths: q.contractMonths,
      prepaymentPercent: q.prepaymentPercent,
      depositPercent: q.depositPercent,
      annualMileage: q.annualMileage,
      v4Monthly,
      productType: q.productType,
    })
  }).filter((r): r is NonNullable<typeof r> => r != null)

  return {
    quoteCount: LOTTE_OBSERVED_QUOTES.length,
    rows,
    disclaimer:
      '상품·보험·보조금 조건 미일치 가능. 차액은 참고값이며 검증된 오차율·시장 정확도가 아님.',
  }
}

export function getVatAndTaxAnalysisNotes(): string[] {
  return [
    'V4 월 자동차세 ≈1,667원: 영업용 전기 승용 연 20,000원 공개 안내의 월 환산(내부 가정). 교육세·지자체 가산 미확인.',
    '실제 렌트사 등록 구분(영업용 여부)은 미확인 — 자가용 배기량 기준세와 혼동 금지.',
    '자동차세는 monthlyOperatingCost에만 포함되며 보험·정비와 항목 분리. 원가에 중복 가산하지 않음.',
    `부가세: ${V4_VAT_TREATMENT.value} — 산출 후 ×1.1 추가 없음(이중 부가세 방지).`,
    '취득·등록비는 V4_MONTHLY_OTHER_OPERATING=0으로 월 운영에 미포함(중복 방지).',
    'V3 월 자동차세 30,000원은 V4에서 채택하지 않음.',
  ]
}

export function getPrepaymentBasisNotes(): string[] {
  return [
    'V4 기본 엔진: 선납·보증 = calculationVehiclePrice(PDF 판매 기준가) × %. 취득원가 개념 없음.',
    '분석 A vehicle_price_change: 선납·보증·잔가 모두 변경된 판매 기준가(list) 기준. prepaymentDepositBasis=list_sale_price.',
    '분석 B acquisition_discount_only: 선납·보증·잔가 = PDF 판매 기준가 고정. 감가·금융 자본만 취득원가. prepaymentDepositBasis=list_sale_price.',
    '분석 B에서 선납을 취득원가 %로 두지 않음 — 고객 표기 판매가와 렌트사 취득가를 분리하기 위함.',
    '가상 차감액은 확정 할인·보조금이 아님.',
  ]
}

export interface PriceModeComparisonRow {
  discountAmount: number
  contractMonths: ContractMonths
  vehiclePriceChange: {
    residualValue: number
    monthlyDepreciation: number
    monthlyFinance: number
    monthlyRental: number
    listVehiclePrice: number
    acquisitionCost: number
  }
  acquisitionDiscountOnly: {
    residualValue: number
    monthlyDepreciation: number
    monthlyFinance: number
    monthlyRental: number
    listVehiclePrice: number
    acquisitionCost: number
  }
  monthlyRentalDelta: number
  residualValueDelta: number
}

/** A/B 모드 독립 비교표 — 롯데 금액 미사용 */
export function compareVehiclePriceVsAcquisitionDiscount(
  input: Omit<V4EstimateInput, 'contractMonths'>,
): PriceModeComparisonRow[] {
  const rows: PriceModeComparisonRow[] = []
  const vpc = buildVehiclePriceChangeScenarios()
  const acq = buildAcquisitionDiscountOnlyScenarios()

  for (let i = 0; i < PRICE_DELTA_AMOUNTS.length; i++) {
    const delta = PRICE_DELTA_AMOUNTS[i].delta
    for (const contractMonths of CONTRACT_MONTHS) {
      const fullInput: V4EstimateInput = { ...input, contractMonths }
      const a = runSensitivityScenario(fullInput, vpc[i])
      const b = runSensitivityScenario(fullInput, acq[i])
      if (!a.ok || !b.ok) continue
      rows.push({
        discountAmount: Math.abs(delta),
        contractMonths,
        vehiclePriceChange: {
          residualValue: a.metrics.residualValue,
          monthlyDepreciation: a.metrics.monthlyDepreciation,
          monthlyFinance: a.metrics.monthlyFinance,
          monthlyRental: a.metrics.monthlyRental,
          listVehiclePrice: a.metrics.listVehiclePrice,
          acquisitionCost: a.metrics.acquisitionCost,
        },
        acquisitionDiscountOnly: {
          residualValue: b.metrics.residualValue,
          monthlyDepreciation: b.metrics.monthlyDepreciation,
          monthlyFinance: b.metrics.monthlyFinance,
          monthlyRental: b.metrics.monthlyRental,
          listVehiclePrice: b.metrics.listVehiclePrice,
          acquisitionCost: b.metrics.acquisitionCost,
        },
        monthlyRentalDelta:
          b.metrics.monthlyRental - a.metrics.monthlyRental,
        residualValueDelta:
          b.metrics.residualValue - a.metrics.residualValue,
      })
    }
  }
  return rows
}
