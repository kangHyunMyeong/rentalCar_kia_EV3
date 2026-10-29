import { EV3_EXTERIOR_COLOR_PRICES } from '@/data/ev3OptionPriceBook'
import { DEFAULT_VEHICLE_PRICE_BASIS } from '@/data/pricingSimulationConfig'
import { getRentalTrimById } from '@/data/rental-trims'
import type { QuoteSelection } from '@/types'
import { calculateV4RentalEstimate } from '../calculator'
import type { V4EstimateInput } from '../types'
import { formatV4MonthlyRentKrw } from './copy'
import {
  buildReviewInputSnapshot,
  diagnoseV4Estimate,
} from './diagnostics'
import type {
  V4UiAdapterInput,
  V4UiAdapterResult,
  V4UiEvidenceBlock,
  V4UiEstimateViewModel,
} from './types'

const DEFAULT_EVIDENCE: V4UiEvidenceBlock = {
  vehiclePrice: 'official_verified',
  residual: 'internal_assumption',
  financing: 'internal_assumption',
  insurance: 'internal_assumption',
  maintenance: 'internal_assumption',
  vehicleTax: 'internal_assumption',
  acquisitionCost: 'unverified',
  subsidy: 'unverified',
  promotion: 'unverified',
}

/** QuoteSelection → V4 어댑터 입력 (옵션·색상은 선택) */
export function normalizeQuoteSelectionToV4UiInput(
  selection: QuoteSelection,
  extras?: Partial<
    Pick<
      V4UiAdapterInput,
      | 'selectedOptionIds'
      | 'exteriorColorId'
      | 'interiorId'
      | 'vehiclePriceBasis'
      | 'prepaymentMode'
    >
  >,
): V4UiAdapterInput {
  return {
    trimId: selection.trimId,
    contractMonths: selection.contractMonths,
    annualMileage: selection.annualMileage,
    prepaymentPercent: selection.prepaymentPercent,
    depositPercent: selection.depositPercent,
    vehiclePriceBasis: extras?.vehiclePriceBasis ?? DEFAULT_VEHICLE_PRICE_BASIS,
    prepaymentMode: extras?.prepaymentMode ?? 'capital_reduction',
    selectedOptionIds: extras?.selectedOptionIds ?? [],
    exteriorColorId: extras?.exteriorColorId,
    interiorId: extras?.interiorId,
  }
}

function toV4Input(input: V4UiAdapterInput): V4EstimateInput {
  return {
    trimId: input.trimId,
    contractMonths: input.contractMonths,
    annualMileage: input.annualMileage,
    prepaymentPercent: input.prepaymentPercent,
    depositPercent: input.depositPercent,
    vehiclePriceBasis: input.vehiclePriceBasis,
    prepaymentMode: input.prepaymentMode,
    selectedOptionIds: input.selectedOptionIds,
    exteriorColorId: input.exteriorColorId,
    interiorId: input.interiorId,
  }
}

function emptyVehicle(input: V4UiAdapterInput) {
  const trim = getRentalTrimById(input.trimId)
  const colorId = input.exteriorColorId ?? null
  return {
    trimId: input.trimId,
    trim: trim?.name ?? input.trimId,
    options: input.selectedOptionIds ?? [],
    exteriorColorId: colorId,
    exteriorColor: colorId
      ? (EV3_EXTERIOR_COLOR_PRICES[colorId]?.label ?? colorId)
      : null,
    interiorId: input.interiorId ?? null,
  }
}

/**
 * V4 계산 결과를 UI 연동용 뷰모델로 변환.
 * Provider·랜딩 UI는 연결하지 않음. 월액 임의 보정 없음.
 */
export function toV4UiEstimate(input: V4UiAdapterInput): V4UiAdapterResult {
  const source = calculateV4RentalEstimate(toV4Input(input))
  const diagnosis = diagnoseV4Estimate(source)
  const vehicle = emptyVehicle(input)
  const contract = {
    months: input.contractMonths,
    annualMileage: input.annualMileage,
    depositPercent: input.depositPercent,
    prepaymentPercent: input.prepaymentPercent,
  }

  if (!source.ok) {
    const viewModel: V4UiEstimateViewModel = {
      estimateType: 'estimated',
      engineVersion: 'v4-unavailable',
      monthlyRentDisplay: null,
      monthlyRentFormatted: null,
      vehicle,
      contract,
      pricing: null,
      breakdown: null,
      evidence: DEFAULT_EVIDENCE,
      validation: {
        isValid: false,
        requiresReview: true,
        warnings: diagnosis.warnings,
        diagnostics: diagnosis.diagnostics,
        estimateStatus: 'unavailable',
      },
      copyKeys: {
        title: 'estimated_monthly_rent',
        disclaimer: 'estimated_not_final',
        cta: 'free_custom_consult',
      },
    }
    return {
      ok: false,
      viewModel,
      sourceOk: false,
      sourceCode: source.code,
    }
  }

  const e = source.estimate
  const monthlyRent = e.monthlyRental
  const isFiniteMonthly = Number.isFinite(monthlyRent)

  // 리뷰용 입력 스냅샷을 경고에 남김(표시는 deferred)
  if (diagnosis.requiresReview) {
    const snap = buildReviewInputSnapshot(e)
    diagnosis.warnings.push(
      `review_input_snapshot=${JSON.stringify(snap)}`,
    )
  }

  const viewModel: V4UiEstimateViewModel = {
    estimateType: 'estimated',
    engineVersion: e.engineVersion,
    monthlyRentDisplay: isFiniteMonthly ? monthlyRent : null,
    monthlyRentFormatted: isFiniteMonthly
      ? formatV4MonthlyRentKrw(monthlyRent)
      : null,
    vehicle,
    contract,
    pricing: {
      vehiclePrice: e.calculationVehiclePrice,
      vehiclePriceBasis: e.vehiclePriceBasis,
      monthlyRent,
      prepaymentAmount: e.prepaymentAmount,
      depositAmount: e.depositAmount,
      totalPayment: e.totalRentalExpenditure,
      totalMonthlyPayments: e.totalMonthlyPayments,
      initialCashOutlay: e.initialCashOutlay,
      residualValue: e.residualValue,
      residualRate: e.residualRate,
    },
    breakdown: {
      depreciation: e.monthlyDepreciation,
      financing: e.monthlyFinance,
      insurance: e.monthlyInsuranceCost,
      vehicleTax: e.monthlyVehicleTax,
      maintenance: e.monthlyMaintenanceCost,
      otherOperating:
        e.monthlyOtherOperatingCost === 0
          ? null
          : e.monthlyOtherOperatingCost,
      depositDiscount: e.monthlyDepositDiscount,
      verifiedPromotion:
        e.verifiedPromotionDiscount === 0
          ? null
          : e.verifiedPromotionDiscount,
      residualValue: e.residualValue,
      financedCapital: e.financedCapital,
    },
    evidence: DEFAULT_EVIDENCE,
    validation: {
      isValid: isFiniteMonthly && monthlyRent >= 0,
      requiresReview: diagnosis.requiresReview,
      warnings: diagnosis.warnings,
      diagnostics: diagnosis.diagnostics,
      estimateStatus: e.estimateStatus,
    },
    copyKeys: {
      title: 'estimated_monthly_rent',
      disclaimer: 'estimated_not_final',
      cta: 'free_custom_consult',
    },
  }

  return {
    ok: isFiniteMonthly,
    viewModel,
    sourceOk: true,
  }
}

/** QuoteSelection 단축 경로 */
export function toV4UiEstimateFromQuoteSelection(
  selection: QuoteSelection,
  extras?: Parameters<typeof normalizeQuoteSelectionToV4UiInput>[1],
): V4UiAdapterResult {
  return toV4UiEstimate(normalizeQuoteSelectionToV4UiInput(selection, extras))
}
