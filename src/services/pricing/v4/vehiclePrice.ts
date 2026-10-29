import {
  EV3_EXTERIOR_COLOR_PRICES,
  EV3_INTERIOR_COLORS,
  EV3_PDF_PRICE_META,
  getOptionDefinition,
  getTrimBattery,
  getTrimGrade,
  type Ev3InteriorId,
  type Ev3OptionId,
} from '@/data/ev3OptionPriceBook'
import {
  getVehiclePriceBookEntry,
  type VehiclePriceBasis,
} from '@/data/rentalVehiclePriceBook'
import type { ExteriorColorId, TrimId } from '@/types'

export interface V4VehiclePriceInput {
  trimId: TrimId
  vehiclePriceBasis: VehiclePriceBasis
  /** 유료로 선택한 옵션 ID만 (기본포함은 넣지 않음) */
  selectedOptionIds?: Ev3OptionId[]
  exteriorColorId?: ExteriorColorId
  interiorId?: Ev3InteriorId
}

export interface V4VehiclePriceBreakdown {
  trimId: TrimId
  grade: ReturnType<typeof getTrimGrade>
  battery: ReturnType<typeof getTrimBattery>
  trimBeforeTaxBenefit: number
  trimAfterTaxBenefit: number
  optionsBeforeTaxTotal: number
  exteriorColorPriceBeforeTax: number
  vehiclePriceBeforeTaxBenefit: number
  /**
   * 트림 세제후 + (옵션·색 세제후 미확인) → 트림 세제후만.
   * 옵션·색을 더한 값을 공식 세제후 확정가로 표시하지 않음.
   */
  vehiclePriceAfterTaxBenefitTrimOnly: number
  calculationVehiclePrice: number
  vehiclePriceBasis: VehiclePriceBasis
  lessorAcquisitionCost: null
  selectedOptions: Array<{
    id: Ev3OptionId
    label: string
    priceBeforeTax: number
  }>
  exteriorColorId: ExteriorColorId | null
  warnings: string[]
  source: typeof EV3_PDF_PRICE_META
}

export type V4VehiclePriceResult =
  | { ok: true; breakdown: V4VehiclePriceBreakdown }
  | { ok: false; code: 'UNKNOWN_TRIM' | 'INVALID_OPTIONS'; message: string; warnings: string[] }

/**
 * PDF 선택 제한 검증.
 * 통과 시 빈 배열, 실패 시 사유 목록.
 */
export function validateEv3OptionSelection(
  trimId: TrimId,
  selectedOptionIds: Ev3OptionId[],
  interiorId?: Ev3InteriorId,
): string[] {
  const errors: string[] = []
  const grade = getTrimGrade(trimId)
  const battery = getTrimBattery(trimId)
  const selected = new Set(selectedOptionIds)

  for (const id of selectedOptionIds) {
    const def = getOptionDefinition(id)
    if (!def) {
      errors.push(`unknown_option:${id}`)
      continue
    }
    const cell = def.byGrade[grade]
    if (cell.availability === 'unavailable') {
      errors.push(`unavailable:${id}`)
    }
    if (cell.availability === 'included') {
      errors.push(`already_included_do_not_readd:${id}`)
    }
  }

  // 에어: 컴포트 II는 컴포트 I 필요
  if (grade === 'air' && selected.has('comfort2') && !selected.has('comfort1')) {
    errors.push('comfort2_requires_comfort1')
  }
  // 에어: 와이드 선루프는 스타일 필요
  if (grade === 'air' && selected.has('wideSunroof') && !selected.has('style')) {
    errors.push('wideSunroof_requires_style_on_air')
  }
  // 4WD는 롱레인지 전용
  if (selected.has('dualMotor4wd') && battery !== 'long-range') {
    errors.push('dualMotor4wd_long_range_only')
  }
  // 롱레인지 에어·어스 4WD는 19인치 필요 (GT-Line은 19인치 기본포함)
  if (
    selected.has('dualMotor4wd') &&
    battery === 'long-range' &&
    grade !== 'gt-line' &&
    !selected.has('wheel19')
  ) {
    errors.push('dualMotor4wd_requires_wheel19_on_long_range_air_earth')
  }
  // 애프터마켓 ↔ 선루프·4WD 동시 불가
  if (
    selected.has('aftermarketCollection') &&
    (selected.has('wideSunroof') || selected.has('dualMotor4wd'))
  ) {
    errors.push('aftermarket_incompatible_with_sunroof_or_4wd')
  }

  if (interiorId) {
    const interior = EV3_INTERIOR_COLORS[interiorId]
    if (!interior.allowedGrades.includes(grade)) {
      errors.push(`interior_not_allowed:${interiorId}_on_${grade}`)
    }
  }

  return errors
}

export function resolveV4VehiclePrice(
  input: V4VehiclePriceInput,
): V4VehiclePriceResult {
  const warnings: string[] = []
  const book = getVehiclePriceBookEntry(input.trimId)
  if (!book) {
    return { ok: false, code: 'UNKNOWN_TRIM', message: '알 수 없는 트림', warnings }
  }

  const optionIds = input.selectedOptionIds ?? []
  const validationErrors = validateEv3OptionSelection(
    input.trimId,
    optionIds,
    input.interiorId,
  )
  if (validationErrors.length > 0) {
    return {
      ok: false,
      code: 'INVALID_OPTIONS',
      message: validationErrors.join('; '),
      warnings: validationErrors,
    }
  }

  const grade = getTrimGrade(input.trimId)
  const selectedOptions: V4VehiclePriceBreakdown['selectedOptions'] = []
  let optionsBeforeTaxTotal = 0

  for (const id of optionIds) {
    const def = getOptionDefinition(id)!
    const cell = def.byGrade[grade]
    // available만 가산 (included는 검증에서 차단)
    optionsBeforeTaxTotal += cell.priceBeforeTax
    selectedOptions.push({
      id,
      label: def.label,
      priceBeforeTax: cell.priceBeforeTax,
    })
  }

  let exteriorColorPriceBeforeTax = 0
  let exteriorColorId: ExteriorColorId | null = null
  if (input.exteriorColorId) {
    const color = EV3_EXTERIOR_COLOR_PRICES[input.exteriorColorId]
    exteriorColorPriceBeforeTax = color.priceBeforeTax
    exteriorColorId = input.exteriorColorId
  }

  const trimBefore = book.vehiclePriceBeforeTaxBenefit
  const trimAfter = book.vehiclePriceAfterTaxBenefit
  const vehiclePriceBeforeTaxBenefit =
    trimBefore + optionsBeforeTaxTotal + exteriorColorPriceBeforeTax

  // 옵션·색 세제후 미확인 → 트림 세제후만 공식 표기값으로 유지
  const vehiclePriceAfterTaxBenefitTrimOnly = trimAfter
  if (optionsBeforeTaxTotal > 0 || exteriorColorPriceBeforeTax > 0) {
    warnings.push(
      'option_or_color_after_tax_unconfirmed — 합산 세제후를 공식 확정가로 표기하지 않음',
    )
  }

  let calculationVehiclePrice: number
  if (input.vehiclePriceBasis === 'afterTaxBenefit') {
    // 세제후 기준: 트림 세제후 + 옵션·색은 세제전 가산(세금 역산 금지) — 혼합 경고
    calculationVehiclePrice =
      trimAfter + optionsBeforeTaxTotal + exteriorColorPriceBeforeTax
    if (optionsBeforeTaxTotal > 0 || exteriorColorPriceBeforeTax > 0) {
      warnings.push(
        'after_tax_basis_with_before_tax_options_colors — 계산용 합산이며 공식 세제후 확정가 아님',
      )
    }
  } else {
    calculationVehiclePrice = vehiclePriceBeforeTaxBenefit
  }

  return {
    ok: true,
    breakdown: {
      trimId: input.trimId,
      grade,
      battery: getTrimBattery(input.trimId),
      trimBeforeTaxBenefit: trimBefore,
      trimAfterTaxBenefit: trimAfter,
      optionsBeforeTaxTotal,
      exteriorColorPriceBeforeTax,
      vehiclePriceBeforeTaxBenefit,
      vehiclePriceAfterTaxBenefitTrimOnly,
      calculationVehiclePrice,
      vehiclePriceBasis: input.vehiclePriceBasis,
      lessorAcquisitionCost: null,
      selectedOptions,
      exteriorColorId,
      warnings,
      source: EV3_PDF_PRICE_META,
    },
  }
}

/** 산술 예시 검증용 */
export function assertPdfPriceExamples(): boolean {
  const e1 = resolveV4VehiclePrice({
    trimId: 'STANDARD_AIR',
    vehiclePriceBasis: 'beforeTaxBenefit',
    selectedOptionIds: ['style'],
    exteriorColorId: 'SWP',
  })
  const e2 = resolveV4VehiclePrice({
    trimId: 'LONG_RANGE_EARTH',
    vehiclePriceBasis: 'beforeTaxBenefit',
    exteriorColorId: 'ABP',
  })
  const e3 = resolveV4VehiclePrice({
    trimId: 'LONG_RANGE_GT_LINE',
    vehiclePriceBasis: 'beforeTaxBenefit',
    selectedOptionIds: ['dualMotor4wd'],
  })
  return (
    e1.ok &&
    e1.breakdown.calculationVehiclePrice === 43_050_000 &&
    e2.ok &&
    e2.breakdown.calculationVehiclePrice === 50_600_000 &&
    e3.ok &&
    e3.breakdown.calculationVehiclePrice === 53_770_000
  )
}
