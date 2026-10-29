import {
  DEFAULT_VEHICLE_PRICE_BASIS,
  PRICING_SIMULATION_META,
  SIM_ANNUAL_FINANCE_RATE_BY_TERM,
  SIM_DEPOSIT_ANNUAL_DISCOUNT_RATE,
  SIM_DEPOSIT_META,
  SIM_FINANCE_META,
  SIM_MILEAGE_META,
  SIM_MILEAGE_RESIDUAL_ADJUSTMENT,
  SIM_MONTHLY_INSURANCE,
  SIM_MONTHLY_MAINTENANCE,
  SIM_MONTHLY_TAX,
  SIM_OPERATING_META,
  SIM_PREPAID_META,
  SIM_PROMOTION_META,
  SIM_PROMOTION_MONTHLY,
  SIM_RESIDUAL_META,
  SIM_RESIDUAL_RATE_BY_TERM,
  SIM_SUSPICIOUSLY_LOW_MONTHLY,
  SIM_VAT_META,
  VEHICLE_PRICE_BASIS_META,
} from '@/data/pricingSimulationConfig'
import {
  getVehiclePriceBookEntry,
  resolveVehiclePrice,
  type VehiclePriceBasis,
} from '@/data/rentalVehiclePriceBook'
import type { TrimId } from '@/types'
import type {
  PrepaidMethod,
  SimulationAssumptionsUsed,
  SimulationCostBreakdown,
  SimulationEstimateInput,
  SimulationEstimateResult,
  SimulationVerificationStatus,
} from './simulation.types'

/** 운영 V2와 동일한 반올림 — 비교용. 시뮬레이션 엔진 전용. */
export function roundSimulationMonthlyRent(amount: number): number {
  return Math.round(amount / 100) * 100
}

function assumptions(): SimulationAssumptionsUsed {
  return {
    residual: SIM_RESIDUAL_META,
    finance: SIM_FINANCE_META,
    mileage: SIM_MILEAGE_META,
    operating: SIM_OPERATING_META,
    deposit: SIM_DEPOSIT_META,
    prepaid: SIM_PREPAID_META,
    promotion: SIM_PROMOTION_META,
    vat: SIM_VAT_META,
    priceBasis: VEHICLE_PRICE_BASIS_META,
  }
}

function fail(
  code: Extract<SimulationEstimateResult, { ok: false }>['code'],
  message: string,
  verificationStatus: SimulationVerificationStatus,
  verificationNotes: string[],
): SimulationEstimateResult {
  return {
    ok: false,
    code,
    message,
    verificationStatus,
    verificationNotes,
    engineVersion: PRICING_SIMULATION_META.version,
  }
}

/**
 * V3 잔존가치·금융 분리 시뮬레이션.
 * 운영 V2(`calculateRentalEstimate`)를 대체하지 않습니다.
 */
export function simulateRentalEstimate(
  input: SimulationEstimateInput,
): SimulationEstimateResult {
  const notes: string[] = []
  const priceBasis: VehiclePriceBasis =
    input.priceBasis ?? DEFAULT_VEHICLE_PRICE_BASIS
  const prepaidMethod: PrepaidMethod =
    input.prepaidMethod ?? 'capital_reduction'

  const trimId = input.trimId as TrimId
  const book = getVehiclePriceBookEntry(trimId)
  if (!book) {
    return fail('UNKNOWN_TRIM', '알 수 없는 트림', 'invalid', notes)
  }

  const vehiclePriceUsed = resolveVehiclePrice(trimId, priceBasis)
  if (vehiclePriceUsed === undefined) {
    return fail('MISSING_VEHICLE_PRICE', '차량가격 없음', 'invalid', notes)
  }

  const N = input.contractMonths
  if (N !== 36 && N !== 48 && N !== 60) {
    return fail('INVALID_CONTRACT_MONTHS', '계약기간 오류', 'invalid', notes)
  }

  if (input.annualMileage === 'unlimited') {
    return fail(
      'UNLIMITED_MILEAGE_CONSULTATION',
      '무제한 주행 조건은 상담 후 확인',
      'consultation_required',
      ['unlimited mileage — no simulated amount'],
    )
  }

  const baseResidual = SIM_RESIDUAL_RATE_BY_TERM[N]
  const mileageAdj = SIM_MILEAGE_RESIDUAL_ADJUSTMENT[input.annualMileage]
  const residualRate = baseResidual + mileageAdj
  if (
    !Number.isFinite(residualRate) ||
    residualRate <= 0 ||
    residualRate >= 1
  ) {
    return fail('INVALID_RESIDUAL', '잔존가치율 오류', 'invalid', [
      `residualRate=${residualRate}`,
    ])
  }

  const residualValue = vehiclePriceUsed * residualRate
  const prepaymentAmount =
    vehiclePriceUsed * (input.prepaymentPercent / 100)
  const depositAmount = vehiclePriceUsed * (input.depositPercent / 100)

  /** 잔가는 원래 차량가 기준 — 선납으로 잔가율을 재적용하지 않음 */
  const financedCapital = vehiclePriceUsed - prepaymentAmount

  const annualFinanceRate = SIM_ANNUAL_FINANCE_RATE_BY_TERM[N]
  const monthlyOperatingCost =
    SIM_MONTHLY_INSURANCE + SIM_MONTHLY_TAX + SIM_MONTHLY_MAINTENANCE
  const depositMonthlyDiscount =
    depositAmount * (SIM_DEPOSIT_ANNUAL_DISCOUNT_RATE / 12)

  let monthlyDepreciation: number
  let monthlyFinanceCost: number
  let flatPnMonthlyReduction = 0

  if (prepaidMethod === 'capital_reduction') {
    monthlyDepreciation = (financedCapital - residualValue) / N
    monthlyFinanceCost =
      ((financedCapital + residualValue) / 2) * (annualFinanceRate / 12)
  } else {
    /** 비교용: 무선납 자본 기준 감가·금융 후 P/N만 차감 (V2 유사) */
    const capitalFull = vehiclePriceUsed
    monthlyDepreciation = (capitalFull - residualValue) / N
    monthlyFinanceCost =
      ((capitalFull + residualValue) / 2) * (annualFinanceRate / 12)
    flatPnMonthlyReduction = prepaymentAmount / N
  }

  const rawMonthlyRent =
    monthlyDepreciation +
    monthlyFinanceCost +
    monthlyOperatingCost +
    SIM_PROMOTION_MONTHLY -
    depositMonthlyDiscount -
    flatPnMonthlyReduction

  if (!Number.isFinite(rawMonthlyRent)) {
    return fail('INVALID_RESULT', '계산 결과 비정상', 'invalid', notes)
  }

  if (rawMonthlyRent < 0) {
    notes.push(
      `negative_raw_monthly=${rawMonthlyRent} — 상향 보정하지 않음, 검증 필요`,
    )
  }

  if (financedCapital < residualValue && prepaidMethod === 'capital_reduction') {
    notes.push(
      `financedCapital(${financedCapital}) < residual(${residualValue}) — 고선납·고잔가 조합, 검증 필요`,
    )
  }

  const roundedMonthlyRent = roundSimulationMonthlyRent(rawMonthlyRent)
  if (roundedMonthlyRent < SIM_SUSPICIOUSLY_LOW_MONTHLY) {
    notes.push(
      `suspiciously_low_monthly=${roundedMonthlyRent} < ${SIM_SUSPICIOUSLY_LOW_MONTHLY} — 임의 상향 없음, needs_verification`,
    )
  }

  let verificationStatus: SimulationVerificationStatus = 'ok'
  if (rawMonthlyRent < 0 || roundedMonthlyRent < SIM_SUSPICIOUSLY_LOW_MONTHLY) {
    verificationStatus = 'needs_verification'
  } else if (notes.some((n) => n.includes('검증 필요'))) {
    verificationStatus = 'needs_verification'
  }

  const totalMonthlyPayments = roundedMonthlyRent * N
  const breakdown: SimulationCostBreakdown = {
    vehiclePriceBeforeTaxBenefit: book.vehiclePriceBeforeTaxBenefit,
    vehiclePriceAfterTaxBenefit: book.vehiclePriceAfterTaxBenefit,
    priceBasis,
    vehiclePriceUsed,
    residualRate,
    residualValue,
    prepaymentPercent: input.prepaymentPercent,
    prepaymentAmount,
    prepaidMethod,
    financedCapital,
    monthlyDepreciation,
    annualFinanceRate,
    monthlyFinanceCost,
    monthlyInsurance: SIM_MONTHLY_INSURANCE,
    monthlyTax: SIM_MONTHLY_TAX,
    monthlyMaintenance: SIM_MONTHLY_MAINTENANCE,
    monthlyOperatingCost,
    monthlyPromotion: SIM_PROMOTION_MONTHLY,
    depositPercent: input.depositPercent,
    depositAmount,
    depositMonthlyDiscount,
    flatPnMonthlyReduction,
    rawMonthlyRent,
    roundedMonthlyRent,
    totalMonthlyPayments,
    totalPrepaidOutlay: prepaymentAmount,
    depositOutlay: depositAmount,
    estimatedTotalOutlayExcludingRefundableDeposit:
      totalMonthlyPayments + prepaymentAmount,
    estimatedTotalCashOutlayIncludingDeposit:
      totalMonthlyPayments + prepaymentAmount + depositAmount,
  }

  return {
    ok: true,
    monthlyEstimate: roundedMonthlyRent,
    breakdown,
    assumptions: assumptions(),
    verificationStatus,
    verificationNotes: notes,
    engineVersion: PRICING_SIMULATION_META.version,
  }
}

/**
 * 동일 입력으로 capital_reduction vs flat_pn 월액 비교.
 */
export function comparePrepaidMethods(input: Omit<SimulationEstimateInput, 'prepaidMethod'>) {
  const capital = simulateRentalEstimate({
    ...input,
    prepaidMethod: 'capital_reduction',
  })
  const flat = simulateRentalEstimate({
    ...input,
    prepaidMethod: 'flat_pn',
  })
  return { capitalReduction: capital, flatPn: flat }
}
