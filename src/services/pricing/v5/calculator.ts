import {
  getV5MarketBaseRate,
  V5_MARKET_RATE_META,
} from '@/data/rentalMarketRatesV5'
import { getVehiclePriceBeforeTax } from '@/data/rentalVehiclePrices'
import type { QuoteSelection } from '@/types'
import {
  computeV5MileageAdjustment,
  computeV5OptionColorMonthlyAdjustment,
} from './adjustments'
import {
  V5_ALREADY_IN_BASE_RATE,
  V5_DEPOSIT_ANNUAL_DISCOUNT,
  V5_ENGINE_META,
  V5_MILEAGE_MONTHLY_DELTA,
  V5_OPTION_COLOR_AMORTIZATION,
  V5_PREPAY_DEPOSIT_PRICE_BASIS,
} from './config'
import type {
  V5AssumptionItem,
  V5EstimateInput,
  V5EstimateResult,
  V5EstimateStatus,
} from './types'

export function roundV5MonthlyRent(amount: number): number {
  return Math.round(amount / 100) * 100
}

function buildAssumptions(): V5AssumptionItem[] {
  return [
    {
      key: 'baseMarketRate',
      value: V5_MARKET_RATE_META.version,
      evidence: 'public_reference',
      note: V5_MARKET_RATE_META.disclaimer,
    },
    {
      key: 'depositAnnualDiscountRate',
      value: V5_DEPOSIT_ANNUAL_DISCOUNT.value,
      evidence: V5_DEPOSIT_ANNUAL_DISCOUNT.evidence,
      note: V5_DEPOSIT_ANNUAL_DISCOUNT.note,
    },
    {
      key: 'mileageMonthlyDelta',
      value: JSON.stringify(V5_MILEAGE_MONTHLY_DELTA.value),
      evidence: V5_MILEAGE_MONTHLY_DELTA.evidence,
      note: V5_MILEAGE_MONTHLY_DELTA.note,
    },
    {
      key: 'optionColorAmortization',
      value: V5_OPTION_COLOR_AMORTIZATION.factor,
      evidence: V5_OPTION_COLOR_AMORTIZATION.evidence,
      note: V5_OPTION_COLOR_AMORTIZATION.note,
    },
    {
      key: 'noDuplicateOpexInBase',
      value: V5_ALREADY_IN_BASE_RATE.join(','),
      evidence: 'unverified',
      note: '기준요율에 보험·세금·보조금 효과가 포함됐을 수 있어 V5에서 재가산하지 않음. 포함이 확정됐다고 표현하지 않음.',
    },
    {
      key: 'prepayDepositPriceBasis',
      value: V5_PREPAY_DEPOSIT_PRICE_BASIS.value,
      evidence: V5_PREPAY_DEPOSIT_PRICE_BASIS.evidence,
      note: V5_PREPAY_DEPOSIT_PRICE_BASIS.note,
    },
  ]
}

/**
 * V5: 시장 참고요율 직접 조회 + 선납 월할 차감 + 보증 할인(기존 가정)
 * + 주행/옵션·색상 독립 조정. EV5 기간 배수 미사용. 운영비 중복 가산 없음.
 */
export function calculateV5RentalEstimate(
  input: V5EstimateInput,
): V5EstimateResult {
  const warnings: string[] = []
  const N = input.contractMonths
  if (N !== 36 && N !== 48 && N !== 60) {
    return {
      ok: false,
      code: 'INVALID_CONTRACT_MONTHS',
      message: '계약기간 오류',
      warnings,
      estimateStatus: 'needs_verification',
    }
  }

  const baseMarketRate = getV5MarketBaseRate(input.trimId, N)
  if (baseMarketRate === undefined) {
    return {
      ok: false,
      code: 'MISSING_BASE_RATE',
      message: '기준요율 없음',
      warnings,
      estimateStatus: 'needs_verification',
    }
  }

  const vehiclePrice = getVehiclePriceBeforeTax(input.trimId)
  if (vehiclePrice === undefined || !(vehiclePrice > 0)) {
    return {
      ok: false,
      code: 'MISSING_VEHICLE_PRICE',
      message: '차량가격 없음',
      warnings,
      estimateStatus: 'needs_verification',
    }
  }

  const mileage = computeV5MileageAdjustment(input.annualMileage)
  if (!mileage.ok) {
    return {
      ok: false,
      code: 'UNLIMITED_MILEAGE_CONSULTATION',
      message: '무제한 주행 조건은 상담 후 확인',
      warnings: ['unlimited mileage'],
      estimateStatus: 'consultation_required',
    }
  }

  const optionColor = computeV5OptionColorMonthlyAdjustment({
    trimId: input.trimId,
    contractMonths: N,
    selectedOptionIds: input.selectedOptionIds,
    exteriorColorId: input.exteriorColorId,
  })
  if (!optionColor.ok) {
    return {
      ok: false,
      code: 'INVALID_OPTIONS',
      message: optionColor.message,
      warnings: optionColor.warnings,
      estimateStatus: 'needs_verification',
    }
  }
  warnings.push(...optionColor.warnings)

  const prepaymentAmount = vehiclePrice * (input.prepaymentPercent / 100)
  const prepaymentMonthlyReduction = prepaymentAmount / N
  const depositAmount = vehiclePrice * (input.depositPercent / 100)
  const depositMonthlyDiscount =
    depositAmount * (V5_DEPOSIT_ANNUAL_DISCOUNT.value / 12)

  const rawMonthlyRental =
    baseMarketRate +
    mileage.amount +
    optionColor.monthlyAdjustment -
    prepaymentMonthlyReduction -
    depositMonthlyDiscount

  if (!Number.isFinite(rawMonthlyRental)) {
    return {
      ok: false,
      code: 'INVALID_RESULT',
      message: '계산 결과 비정상',
      warnings,
      estimateStatus: 'needs_verification',
    }
  }

  const monthlyRental = roundV5MonthlyRent(rawMonthlyRental)
  let estimateStatus: V5EstimateStatus = 'public_reference'
  if (
    input.annualMileage !== 20_000 ||
    input.depositPercent > 0 ||
    (input.selectedOptionIds?.length ?? 0) > 0 ||
    input.exteriorColorId
  ) {
    estimateStatus = 'simulation_assumption'
  }
  if (rawMonthlyRental < 0) {
    warnings.push(`negative_raw_monthly=${rawMonthlyRental}`)
    estimateStatus = 'needs_verification'
  }

  const totalMonthlyPayments = monthlyRental * N
  return {
    ok: true,
    estimate: {
      engineVersion: V5_ENGINE_META.version,
      monthlyRental,
      rawMonthlyRental,
      baseMarketRate,
      mileageAdjustment: mileage.amount,
      optionColorMonthlyAdjustment: optionColor.monthlyAdjustment,
      prepaymentMonthlyReduction,
      depositMonthlyDiscount,
      vehiclePriceBeforeTax: vehiclePrice,
      prepaymentAmount,
      depositAmount,
      totalMonthlyPayments,
      totalRentalExpenditure: totalMonthlyPayments + prepaymentAmount,
      initialCashOutlay: prepaymentAmount + depositAmount,
      contractMonths: N,
      annualMileage: input.annualMileage,
      trimId: input.trimId,
      prepaymentPercent: input.prepaymentPercent,
      depositPercent: input.depositPercent,
      pricingBasis: `${V5_MARKET_RATE_META.sourceDetail} @ ${V5_MARKET_RATE_META.asOf}; sources=${V5_MARKET_RATE_META.sourceUrls.join(' | ')}; no EV5 term multipliers; no duplicate opex`,
      estimateStatus,
      assumptionsRequiringVerification: buildAssumptions(),
      warnings,
    },
  }
}

export function calculateV5FromQuoteSelection(
  selection: QuoteSelection,
): V5EstimateResult {
  return calculateV5RentalEstimate({
    trimId: selection.trimId,
    contractMonths: selection.contractMonths,
    annualMileage: selection.annualMileage,
    prepaymentPercent: selection.prepaymentPercent,
    depositPercent: selection.depositPercent,
    exteriorColorId: selection.exteriorColorId,
    selectedOptionIds: selection.selectedOptionIds,
  })
}
