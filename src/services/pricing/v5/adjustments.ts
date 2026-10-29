import {
  EV3_EXTERIOR_COLOR_PRICES,
  type Ev3OptionId,
} from '@/data/ev3OptionPriceBook'
import type { AnnualMileage, ContractMonths, ExteriorColorId, TrimId } from '@/types'
import { validateEv3OptionSelection } from '../v4/vehiclePrice'
import { resolveV4VehiclePrice } from '../v4/vehiclePrice'
import {
  V5_MILEAGE_MONTHLY_DELTA,
  V5_OPTION_COLOR_AMORTIZATION,
} from './config'

/**
 * 주행거리 월액 조정 — 기준요율과 독립 모듈.
 * 보험·세금 재가산 없음.
 */
export function computeV5MileageAdjustment(
  annualMileage: AnnualMileage,
): { ok: true; amount: number } | { ok: false; code: 'UNLIMITED' } {
  if (annualMileage === 'unlimited') {
    return { ok: false, code: 'UNLIMITED' }
  }
  return {
    ok: true,
    amount: V5_MILEAGE_MONTHLY_DELTA.value[annualMileage] ?? 0,
  }
}

/**
 * 옵션·외장색 추가금 → 월액 가산 (내부 가정 월할).
 * 선택 없으면 0. 기준요율에 기본옵션이 포함된 것으로 보고 추가분만 가산.
 */
export function computeV5OptionColorMonthlyAdjustment(input: {
  trimId: TrimId
  contractMonths: ContractMonths
  selectedOptionIds?: Ev3OptionId[]
  exteriorColorId?: ExteriorColorId
}):
  | {
      ok: true
      monthlyAdjustment: number
      optionsBeforeTaxTotal: number
      exteriorColorPriceBeforeTax: number
      warnings: string[]
    }
  | { ok: false; message: string; warnings: string[] } {
  const selectedOptionIds = input.selectedOptionIds ?? []
  const warnings: string[] = []

  if (selectedOptionIds.length === 0 && !input.exteriorColorId) {
    return {
      ok: true,
      monthlyAdjustment: 0,
      optionsBeforeTaxTotal: 0,
      exteriorColorPriceBeforeTax: 0,
      warnings,
    }
  }

  const errors = validateEv3OptionSelection(
    input.trimId,
    selectedOptionIds,
  )
  if (errors.length > 0) {
    return {
      ok: false,
      message: errors.join('; '),
      warnings: errors,
    }
  }

  const priced = resolveV4VehiclePrice({
    trimId: input.trimId,
    vehiclePriceBasis: 'beforeTaxBenefit',
    selectedOptionIds,
    exteriorColorId: input.exteriorColorId,
  })
  if (!priced.ok) {
    return { ok: false, message: priced.message, warnings: priced.warnings }
  }

  const optionsBeforeTaxTotal = priced.breakdown.optionsBeforeTaxTotal
  const exteriorColorPriceBeforeTax =
    priced.breakdown.exteriorColorPriceBeforeTax
  const addOnTotal = optionsBeforeTaxTotal + exteriorColorPriceBeforeTax

  if (input.exteriorColorId && exteriorColorPriceBeforeTax === 0) {
    const label =
      EV3_EXTERIOR_COLOR_PRICES[input.exteriorColorId]?.label ??
      input.exteriorColorId
    warnings.push(`base_or_zero_color:${label}`)
  }

  warnings.push(
    `option_color_amortization_factor=${V5_OPTION_COLOR_AMORTIZATION.factor} (${V5_OPTION_COLOR_AMORTIZATION.evidence})`,
  )

  const monthlyAdjustment =
    (addOnTotal / input.contractMonths) * V5_OPTION_COLOR_AMORTIZATION.factor

  return {
    ok: true,
    monthlyAdjustment,
    optionsBeforeTaxTotal,
    exteriorColorPriceBeforeTax,
    warnings,
  }
}
