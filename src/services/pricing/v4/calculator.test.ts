import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RENTAL_CONDITIONS } from '@/data/rental-conditions'
import {
  assertPriceBookAlignedWithV2,
  RENTAL_VEHICLE_PRICE_BOOK,
} from '@/data/rentalVehiclePriceBook'
import { RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'
import type { TrimId } from '@/types'
import { calculateRentalEstimate } from '../calculateRentalEstimate'
import { simulateRentalEstimate } from '../simulation/simulateRentalEstimate'
import {
  calculateV4RentalEstimate,
  compareV4MileageModes,
  compareV4PrepaymentModes,
} from './calculator'
import { V4_MONTHLY_VEHICLE_TAX, V4_PDF_OPTION_NOTES } from './config'

const TRIMS = Object.keys(RENTAL_VEHICLE_PRICES) as TrimId[]
const TERMS = RENTAL_CONDITIONS.contractMonths
const PREPAYS = RENTAL_CONDITIONS.prepaymentPercents
const DEPOSITS = RENTAL_CONDITIONS.depositPercents
const MILEAGES = RENTAL_CONDITIONS.annualMileages.filter((m) => m !== 'unlimited')

const OFFICIAL_PDF_PRICES: Record<TrimId, { before: number; after: number }> = {
  STANDARD_AIR: { before: 42_030_000, after: 39_950_000 },
  STANDARD_EARTH: { before: 46_180_000, after: 43_900_000 },
  STANDARD_GT_LINE: { before: 47_080_000, after: 44_750_000 },
  LONG_RANGE_AIR: { before: 46_450_000, after: 44_150_000 },
  LONG_RANGE_EARTH: { before: 50_600_000, after: 48_100_000 },
  LONG_RANGE_GT_LINE: { before: 51_500_000, after: 48_950_000 },
}

describe('V4 official price book', () => {
  it('6트림 세제전·후가 사용자 PDF 데이터와 일치한다', () => {
    expect(assertPriceBookAlignedWithV2()).toBe(true)
    for (const trimId of TRIMS) {
      const book = RENTAL_VEHICLE_PRICE_BOOK[trimId]
      expect(book.vehiclePriceBeforeTaxBenefit).toBe(
        OFFICIAL_PDF_PRICES[trimId].before,
      )
      expect(book.vehiclePriceAfterTaxBenefit).toBe(
        OFFICIAL_PDF_PRICES[trimId].after,
      )
    }
  })

  it('옵션 세제후는 미확인으로 표시한다', () => {
    expect(V4_PDF_OPTION_NOTES.optionAfterTaxBenefit).toBe('unconfirmed')
  })

  it('V4 자동차세는 V3 월3만 미채택(영업용 EV 연2만 환산)', () => {
    expect(V4_MONTHLY_VEHICLE_TAX.value).toBe(Math.round(20_000 / 12))
  })
})

describe('V4 core', () => {
  it('선납0·보증0·20k에서 전 트림 36>48>60 (배수 강제 없음)', () => {
    for (const trimId of TRIMS) {
      const rents = TERMS.map((contractMonths) => {
        const r = calculateV4RentalEstimate({
          trimId,
          prepaymentPercent: 0,
          depositPercent: 0,
          annualMileage: 20_000,
          contractMonths,
        })
        expect(r.ok).toBe(true)
        return r.ok ? r.estimate.monthlyRental : 0
      })
      expect(rents[0]).toBeGreaterThan(rents[1])
      expect(rents[1]).toBeGreaterThan(rents[2])
    }
  })

  it('선납↑ 월액↓, 총지출 분리', () => {
    const series = PREPAYS.map((prepaymentPercent) => {
      const r = calculateV4RentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        prepaymentPercent,
        depositPercent: 0,
        annualMileage: 20_000,
        contractMonths: 60,
      })
      expect(r.ok).toBe(true)
      return r.ok ? r.estimate : null
    })
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!.monthlyRental).toBeLessThan(series[i - 1]!.monthlyRental)
    }
  })

  it('보증금 원금 미차감', () => {
    const base = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 48,
    })
    const withDep = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 20,
      annualMileage: 20_000,
      contractMonths: 48,
    })
    expect(base.ok && withDep.ok).toBe(true)
    if (!base.ok || !withDep.ok) return
    expect(withDep.estimate.financedCapital).toBe(base.estimate.financedCapital)
    expect(withDep.estimate.monthlyRental).toBeLessThan(base.estimate.monthlyRental)
  })

  it('주행↑ 월액↑ (residual)', () => {
    const rents = MILEAGES.map((annualMileage) => {
      const r = calculateV4RentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        prepaymentPercent: 0,
        depositPercent: 0,
        annualMileage,
        contractMonths: 48,
      })
      expect(r.ok).toBe(true)
      return r.ok ? r.estimate.monthlyRental : 0
    })
    expect(rents[0]).toBeLessThan(rents[1])
    expect(rents[1]).toBeLessThan(rents[2])
    expect(rents[2]).toBeLessThan(rents[3])
  })

  it('옵션·색상 반영 시 월액 변화', () => {
    const base = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 60,
    })
    const withOpts = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 60,
      selectedOptionIds: ['style'],
      exteriorColorId: 'SWP',
    })
    expect(base.ok && withOpts.ok).toBe(true)
    if (!base.ok || !withOpts.ok) return
    expect(withOpts.estimate.calculationVehiclePrice).toBe(43_050_000)
    expect(withOpts.estimate.monthlyRental).toBeGreaterThan(
      base.estimate.monthlyRental,
    )
  })

  it('invalid option combo fails before calc', () => {
    const r = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 36,
      selectedOptionIds: ['comfort2'],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INVALID_OPTIONS')
  })

  it('capital vs flat_pn', () => {
    const { capitalReduction, flatPn } = compareV4PrepaymentModes({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 20,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 48,
    })
    expect(capitalReduction.ok && flatPn.ok).toBe(true)
    if (!capitalReduction.ok || !flatPn.ok) return
    expect(capitalReduction.estimate.monthlyRental).toBeLessThanOrEqual(
      flatPn.estimate.monthlyRental,
    )
  })

  it('mileage modes not double-applied', () => {
    const { residualAdjustment, flatMonthlyDelta } = compareV4MileageModes({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 30_000,
      contractMonths: 36,
    })
    expect(residualAdjustment.ok && flatMonthlyDelta.ok).toBe(true)
    if (!residualAdjustment.ok || !flatMonthlyDelta.ok) return
    expect(residualAdjustment.estimate.monthlyRental).not.toBe(
      flatMonthlyDelta.estimate.monthlyRental,
    )
  })

  it('전수 스캔: 유한값·하한없음·보조금 미차감', () => {
    let ok = 0
    for (const trimId of TRIMS) {
      for (const contractMonths of TERMS) {
        for (const prepaymentPercent of PREPAYS) {
          for (const depositPercent of DEPOSITS) {
            for (const annualMileage of MILEAGES) {
              const r = calculateV4RentalEstimate({
                trimId,
                contractMonths,
                prepaymentPercent,
                depositPercent,
                annualMileage,
              })
              expect(r.ok).toBe(true)
              if (!r.ok) continue
              ok++
              expect(Number.isFinite(r.estimate.monthlyRental)).toBe(true)
              expect(r.estimate.lessorAcquisitionCost).toBeNull()
              expect(r.estimate.subsidyTreatment).toBe('unconfirmed_not_applied')
              expect(r.estimate.monthlyRental).toBe(
                Math.round(r.estimate.rawMonthlyRental / 100) * 100,
              )
            }
          }
        }
      }
    }
    expect(ok).toBe(
      TRIMS.length * TERMS.length * PREPAYS.length * DEPOSITS.length * MILEAGES.length,
    )
  })

  it('선납30% 기간 역전을 강제 정렬하지 않는다', () => {
    const rents = TERMS.map((contractMonths) => {
      const r = calculateV4RentalEstimate({
        trimId: 'STANDARD_AIR',
        prepaymentPercent: 30,
        depositPercent: 0,
        annualMileage: 20_000,
        contractMonths,
      })
      expect(r.ok).toBe(true)
      return r.ok ? r.estimate.monthlyRental : 0
    })
    expect(rents.every((n) => Number.isFinite(n))).toBe(true)
  })
})

describe('V4 independence from Lotte', () => {
  it('calculator/config에 lotte 문자열이 없다', () => {
    const calcSrc = readFileSync(
      resolve(process.cwd(), 'src/services/pricing/v4/calculator.ts'),
      'utf8',
    )
    const configSrc = readFileSync(
      resolve(process.cwd(), 'src/services/pricing/v4/config.ts'),
      'utf8',
    )
    const priceSrc = readFileSync(
      resolve(process.cwd(), 'src/services/pricing/v4/vehiclePrice.ts'),
      'utf8',
    )
    expect(calcSrc).not.toMatch(/lotte/i)
    expect(configSrc).not.toMatch(/lotte/i)
    expect(priceSrc).not.toMatch(/lotte/i)
  })

  it('동일 입력 결정적 결과', () => {
    const a = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 48,
    })
    const b = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 48,
    })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.estimate.monthlyRental).toBe(b.estimate.monthlyRental)
  })
})

describe('V2 V3 V4 regression independence', () => {
  it('V2 롱어스 0/0/60 = 549000 유지', () => {
    const v2 = calculateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 60,
    })
    expect(v2.ok).toBe(true)
    if (v2.ok) expect(v2.roundedMonthlyRent).toBe(549_000)
  })

  it('V3·V4 정상 산출', () => {
    const v3 = simulateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 60,
    })
    const v4 = calculateV4RentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 60,
    })
    expect(v3.ok && v4.ok).toBe(true)
  })
})
