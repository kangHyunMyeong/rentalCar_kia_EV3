import { describe, expect, it } from 'vitest'
import {
  assertPdfPriceExamples,
  resolveV4VehiclePrice,
  validateEv3OptionSelection,
} from './vehiclePrice'

describe('V4 vehiclePrice (PDF)', () => {
  it('산술 예시 3건이 PDF 합산과 일치한다', () => {
    expect(assertPdfPriceExamples()).toBe(true)
  })

  it('기본포함 옵션을 재가산하면 검증 실패', () => {
    const errors = validateEv3OptionSelection('STANDARD_EARTH', ['style'])
    expect(errors.some((e) => e.includes('already_included'))).toBe(true)
  })

  it('에어 컴포트II는 컴포트I 필요', () => {
    expect(
      validateEv3OptionSelection('STANDARD_AIR', ['comfort2']),
    ).toContain('comfort2_requires_comfort1')
    expect(
      validateEv3OptionSelection('STANDARD_AIR', ['comfort1', 'comfort2']),
    ).toHaveLength(0)
  })

  it('에어 선루프는 스타일 필요', () => {
    expect(
      validateEv3OptionSelection('STANDARD_AIR', ['wideSunroof']),
    ).toContain('wideSunroof_requires_style_on_air')
  })

  it('4WD는 롱레인지 + (에어/어스 시) 19인치', () => {
    expect(
      validateEv3OptionSelection('STANDARD_AIR', ['dualMotor4wd']),
    ).toContain('dualMotor4wd_long_range_only')
    expect(
      validateEv3OptionSelection('LONG_RANGE_EARTH', ['dualMotor4wd']),
    ).toContain('dualMotor4wd_requires_wheel19_on_long_range_air_earth')
    expect(
      validateEv3OptionSelection('LONG_RANGE_EARTH', [
        'wheel19',
        'dualMotor4wd',
      ]),
    ).toHaveLength(0)
    expect(
      validateEv3OptionSelection('LONG_RANGE_GT_LINE', ['dualMotor4wd']),
    ).toHaveLength(0)
  })

  it('애프터마켓은 선루프·4WD와 비호환', () => {
    expect(
      validateEv3OptionSelection('LONG_RANGE_EARTH', [
        'wheel19',
        'aftermarketCollection',
        'dualMotor4wd',
      ]),
    ).toContain('aftermarket_incompatible_with_sunroof_or_4wd')
  })

  it('실내색 트림 제한', () => {
    expect(
      validateEv3OptionSelection('STANDARD_AIR', [], 'light_gray'),
    ).toContain('interior_not_allowed:light_gray_on_air')
    expect(
      validateEv3OptionSelection('LONG_RANGE_GT_LINE', [], 'charcoal_white'),
    ).toHaveLength(0)
  })

  it('외장색 추가금 반영', () => {
    const r = resolveV4VehiclePrice({
      trimId: 'STANDARD_AIR',
      vehiclePriceBasis: 'beforeTaxBenefit',
      exteriorColorId: 'ISM',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.breakdown.exteriorColorPriceBeforeTax).toBe(300_000)
    expect(r.breakdown.calculationVehiclePrice).toBe(42_330_000)
  })

  it('취득원가는 미확인(null)', () => {
    const r = resolveV4VehiclePrice({
      trimId: 'LONG_RANGE_EARTH',
      vehiclePriceBasis: 'beforeTaxBenefit',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.breakdown.lessorAcquisitionCost).toBeNull()
  })
})
