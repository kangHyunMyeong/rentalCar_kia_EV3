import { DEFAULT_VEHICLE_PRICE_BASIS } from '@/data/pricingSimulationConfig'
import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'
import {
  V4_ANNUAL_FINANCE_RATE_BY_TERM,
  V4_DEPOSIT_ANNUAL_DISCOUNT_RATE,
  V4_ENGINE_META,
  V4_MILEAGE_FLAT_MONTHLY_DELTA,
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
} from './config'
import type {
  V4AssumptionRecord,
  V4EstimateInput,
  V4EstimateResult,
  V4EstimateStatus,
  V4PrepaymentMode,
  V4RentalEstimate,
} from './types'
import { resolveV4VehiclePrice } from './vehiclePrice'

export function roundV4MonthlyRent(amount: number): number {
  return Math.round(amount / 100) * 100
}

function buildAssumptions(): V4AssumptionRecord[] {
  return [
    {
      key: 'residualRateByTerm',
      value: JSON.stringify(V4_RESIDUAL_RATE_BY_TERM.value),
      evidence: V4_RESIDUAL_RATE_BY_TERM.evidence,
      note: V4_RESIDUAL_RATE_BY_TERM.note,
    },
    {
      key: 'annualFinanceRate',
      value: JSON.stringify(V4_ANNUAL_FINANCE_RATE_BY_TERM.value),
      evidence: V4_ANNUAL_FINANCE_RATE_BY_TERM.evidence,
      note: V4_ANNUAL_FINANCE_RATE_BY_TERM.note,
    },
    {
      key: 'monthlyInsurance',
      value: V4_MONTHLY_INSURANCE.value,
      evidence: V4_MONTHLY_INSURANCE.evidence,
      note: V4_MONTHLY_INSURANCE.note,
    },
    {
      key: 'monthlyVehicleTax',
      value: V4_MONTHLY_VEHICLE_TAX.value,
      evidence: V4_MONTHLY_VEHICLE_TAX.evidence,
      note: V4_MONTHLY_VEHICLE_TAX.note,
    },
    {
      key: 'monthlyMaintenance',
      value: V4_MONTHLY_MAINTENANCE.value,
      evidence: V4_MONTHLY_MAINTENANCE.evidence,
      note: V4_MONTHLY_MAINTENANCE.note,
    },
    {
      key: 'depositAnnualDiscountRate',
      value: V4_DEPOSIT_ANNUAL_DISCOUNT_RATE.value,
      evidence: V4_DEPOSIT_ANNUAL_DISCOUNT_RATE.evidence,
      note: V4_DEPOSIT_ANNUAL_DISCOUNT_RATE.note,
    },
    {
      key: 'vat',
      value: V4_VAT_TREATMENT.value,
      evidence: V4_VAT_TREATMENT.evidence,
      note: V4_VAT_TREATMENT.note,
    },
    {
      key: 'subsidy',
      value: V4_SUBSIDY_TREATMENT.value,
      evidence: V4_SUBSIDY_TREATMENT.evidence,
      note: V4_SUBSIDY_TREATMENT.note,
    },
  ]
}

function fail(
  code: Extract<V4EstimateResult, { ok: false }>['code'],
  message: string,
  warnings: string[] = [],
): V4EstimateResult {
  return {
    ok: false,
    code,
    message,
    warnings,
    estimateStatus: 'needs_verification',
  }
}

/**
 * V4: 사용자 제공 price_ev3.pdf 차량가 기반 독립 예상 월 렌트료.
 * 운영 V2·실험 V3 비변경. 롯데 금액 미사용·미캘리브레이션.
 */
export function calculateV4RentalEstimate(
  input: V4EstimateInput,
): V4EstimateResult {
  const warnings: string[] = []
  const priceBasis: VehiclePriceBasis =
    input.vehiclePriceBasis ?? DEFAULT_VEHICLE_PRICE_BASIS
  const prepaymentMode: V4PrepaymentMode =
    input.prepaymentMode ?? 'capital_reduction'
  const mileageMode = input.mileageMode ?? 'residual_adjustment'

  const priced = resolveV4VehiclePrice({
    trimId: input.trimId,
    vehiclePriceBasis: priceBasis,
    selectedOptionIds: input.selectedOptionIds,
    exteriorColorId: input.exteriorColorId,
    interiorId: input.interiorId,
  })
  if (!priced.ok) {
    return fail(
      priced.code === 'UNKNOWN_TRIM' ? 'UNKNOWN_TRIM' : 'INVALID_OPTIONS',
      priced.message,
      priced.warnings,
    )
  }

  warnings.push(...priced.breakdown.warnings)
  const calculationVehiclePrice = priced.breakdown.calculationVehiclePrice
  const N = input.contractMonths
  if (N !== 36 && N !== 48 && N !== 60) {
    return fail('INVALID_CONTRACT_MONTHS', '계약기간 오류', warnings)
  }

  if (input.annualMileage === 'unlimited') {
    return fail(
      'UNLIMITED_MILEAGE_CONSULTATION',
      '무제한 주행 조건은 상담 후 확인',
      ['unlimited mileage — no simulated amount'],
    )
  }

  const baseResidual = V4_RESIDUAL_RATE_BY_TERM.value[N]
  let residualRate = baseResidual
  let flatMileageDelta = 0

  if (mileageMode === 'residual_adjustment') {
    residualRate += V4_MILEAGE_RESIDUAL_ADJUSTMENT.value[input.annualMileage]
  } else {
    flatMileageDelta = V4_MILEAGE_FLAT_MONTHLY_DELTA.value[input.annualMileage]
    warnings.push(
      'mileage_mode_flat_monthly_delta — 잔가 가감과 동시 미적용(비교용)',
    )
  }

  if (!Number.isFinite(residualRate) || residualRate <= 0 || residualRate >= 1) {
    return fail('INVALID_RESIDUAL', `잔존가치율 오류: ${residualRate}`, warnings)
  }

  /** 잔가는 선납 전 계산 기준가 — 선납 중복 반영 금지 */
  const residualPriceBasisAmount = calculationVehiclePrice
  const residualValue = residualPriceBasisAmount * residualRate
  const prepaymentAmount =
    calculationVehiclePrice * (input.prepaymentPercent / 100)
  const depositAmount = calculationVehiclePrice * (input.depositPercent / 100)
  const financedCapital = calculationVehiclePrice - prepaymentAmount
  const annualFinanceRate = V4_ANNUAL_FINANCE_RATE_BY_TERM.value[N]

  let monthlyDepreciation: number
  let monthlyFinance: number
  let flatPnMonthlyReduction = 0

  if (prepaymentMode === 'capital_reduction') {
    monthlyDepreciation = (financedCapital - residualValue) / N
    /** 평균 금융원금 근사 — 실제 MF/렌트사 공식 아님 */
    monthlyFinance =
      ((financedCapital + residualValue) / 2) * (annualFinanceRate / 12)
  } else {
    monthlyDepreciation = (calculationVehiclePrice - residualValue) / N
    monthlyFinance =
      ((calculationVehiclePrice + residualValue) / 2) * (annualFinanceRate / 12)
    flatPnMonthlyReduction = prepaymentAmount / N
  }

  if (financedCapital < residualValue && prepaymentMode === 'capital_reduction') {
    warnings.push(
      `negative_or_thin_depreciation_risk: financedCapital(${Math.round(financedCapital)}) < residual(${Math.round(residualValue)})`,
    )
  }
  if (monthlyDepreciation < 0) {
    warnings.push(
      `negative_monthly_depreciation=${monthlyDepreciation} — 임의 0원 보정 없음`,
    )
  }

  const monthlyInsuranceCost = V4_MONTHLY_INSURANCE.value
  const monthlyVehicleTax = V4_MONTHLY_VEHICLE_TAX.value
  const monthlyMaintenanceCost = V4_MONTHLY_MAINTENANCE.value
  const monthlyOtherOperatingCost = V4_MONTHLY_OTHER_OPERATING.value
  const monthlyOperatingCost =
    monthlyInsuranceCost +
    monthlyVehicleTax +
    monthlyMaintenanceCost +
    monthlyOtherOperatingCost

  const monthlyDepositDiscount =
    depositAmount * (V4_DEPOSIT_ANNUAL_DISCOUNT_RATE.value / 12)
  const verifiedPromotionDiscount = V4_VERIFIED_PROMOTION_MONTHLY.value

  const rawMonthlyRental =
    monthlyDepreciation +
    monthlyFinance +
    monthlyOperatingCost +
    flatMileageDelta -
    monthlyDepositDiscount -
    verifiedPromotionDiscount -
    flatPnMonthlyReduction

  if (!Number.isFinite(rawMonthlyRental)) {
    return fail('INVALID_RESULT', '계산 결과 비정상(NaN/Infinity)', warnings)
  }
  if (rawMonthlyRental < 0) {
    warnings.push(
      `negative_raw_monthly=${rawMonthlyRental} — 하한 보정 없음, needs_verification`,
    )
  }

  const monthlyRental = roundV4MonthlyRent(rawMonthlyRental)
  if (monthlyRental < V4_SUSPICIOUSLY_LOW_MONTHLY) {
    warnings.push(
      `suspiciously_low_monthly=${monthlyRental} < ${V4_SUSPICIOUSLY_LOW_MONTHLY}`,
    )
  }

  let estimateStatus: V4EstimateStatus = 'simulation_assumption'
  if (
    rawMonthlyRental < 0 ||
    monthlyRental < V4_SUSPICIOUSLY_LOW_MONTHLY ||
    warnings.some((w) => w.includes('negative_'))
  ) {
    estimateStatus = 'needs_verification'
  }

  const totalMonthlyPayments = monthlyRental * N
  const estimate: V4RentalEstimate = {
    engineVersion: V4_ENGINE_META.version,
    monthlyRental,
    rawMonthlyRental,
    selectedTrim: input.trimId,
    vehiclePriceBeforeTax: priced.breakdown.vehiclePriceBeforeTaxBenefit,
    vehiclePriceAfterTaxBenefit:
      priced.breakdown.vehiclePriceAfterTaxBenefitTrimOnly,
    vehiclePriceBasis: priceBasis,
    calculationVehiclePrice,
    lessorAcquisitionCost: null,
    optionsBeforeTaxTotal: priced.breakdown.optionsBeforeTaxTotal,
    exteriorColorPriceBeforeTax: priced.breakdown.exteriorColorPriceBeforeTax,
    contractMonths: N,
    annualMileage: input.annualMileage,
    prepaymentRate: input.prepaymentPercent,
    prepaymentAmount,
    prepaymentMode,
    depositRate: input.depositPercent,
    depositAmount,
    residualValue,
    residualRate,
    residualPriceBasisAmount,
    financedCapital,
    monthlyDepreciation,
    monthlyFinance,
    monthlyInsuranceCost,
    monthlyVehicleTax,
    monthlyMaintenanceCost,
    monthlyOtherOperatingCost,
    monthlyOperatingCost,
    monthlyDepositDiscount,
    verifiedPromotionDiscount,
    flatPnMonthlyReduction,
    totalMonthlyPayments,
    totalRentalExpenditure: totalMonthlyPayments + prepaymentAmount,
    initialCashOutlay: prepaymentAmount + depositAmount,
    subsidyTreatment: 'unconfirmed_not_applied',
    vatTreatment: V4_VAT_TREATMENT.value,
    estimateStatus,
    warnings,
    assumptions: buildAssumptions(),
  }

  return { ok: true, estimate }
}

export function compareV4PrepaymentModes(
  input: Omit<V4EstimateInput, 'prepaymentMode'>,
) {
  return {
    capitalReduction: calculateV4RentalEstimate({
      ...input,
      prepaymentMode: 'capital_reduction',
    }),
    flatPn: calculateV4RentalEstimate({ ...input, prepaymentMode: 'flat_pn' }),
  }
}

export function compareV4MileageModes(
  input: Omit<V4EstimateInput, 'mileageMode'>,
) {
  return {
    residualAdjustment: calculateV4RentalEstimate({
      ...input,
      mileageMode: 'residual_adjustment',
    }),
    flatMonthlyDelta: calculateV4RentalEstimate({
      ...input,
      mileageMode: 'flat_monthly_delta',
    }),
  }
}
