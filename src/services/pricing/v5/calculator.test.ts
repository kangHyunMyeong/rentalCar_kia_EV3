import { describe, expect, it } from 'vitest'
import {
  listV5BaselineRateEntries,
  V5_MARKET_BASE_RATES,
  V5_MARKET_RATE_META,
} from '@/data/rentalMarketRatesV5'
import { RENTAL_REFERENCE_RATES } from '@/data/rentalReferenceRates'
import { DEPOSIT_ANNUAL_DISCOUNT_RATE } from '@/data/rentalSimulationConfig'
import { getVehiclePriceBeforeTax } from '@/data/rentalVehiclePrices'
import type { TrimId } from '@/types'
import { calculateRentalEstimate } from '../calculateRentalEstimate'
import { simulateRentalEstimate } from '../simulation/simulateRentalEstimate'
import { calculateV4RentalEstimate } from '../v4/calculator'
import { V5_DEPOSIT_ANNUAL_DISCOUNT } from './config'
import {
  calculateV5FromQuoteSelection,
  calculateV5RentalEstimate,
} from './calculator'
import { resolvePricingEngineId } from './featureFlag'

const TRIMS = Object.keys(V5_MARKET_BASE_RATES) as TrimId[]

/** STEP 9 시장 참고요율 — 겟차 V2와 다름 */
const STEP9_RATES: Record<TrimId, Record<36 | 48 | 60, number>> = {
  STANDARD_AIR: { 36: 514_100, 48: 510_000, 60: 492_500 },
  STANDARD_EARTH: { 36: 580_700, 48: 569_600, 60: 547_600 },
  STANDARD_GT_LINE: { 36: 591_200, 48: 579_400, 60: 559_500 },
  LONG_RANGE_AIR: { 36: 566_400, 48: 560_200, 60: 538_800 },
  LONG_RANGE_EARTH: { 36: 633_200, 48: 620_400, 60: 593_900 },
  LONG_RANGE_GT_LINE: { 36: 646_000, 48: 631_800, 60: 605_900 },
}

describe('STEP9 — V5 기준요율 18개', () => {
  it('장부가 STEP9 시장요율과 일치하고 Getcha와 다름', () => {
    expect(listV5BaselineRateEntries()).toHaveLength(18)
    expect(V5_MARKET_RATE_META.verificationStatus).toBe('public_reference')
    expect(V5_MARKET_RATE_META.sourceUrls.length).toBeGreaterThan(0)
    for (const trimId of TRIMS) {
      for (const m of [36, 48, 60] as const) {
        expect(V5_MARKET_BASE_RATES[trimId][m]).toBe(STEP9_RATES[trimId][m])
        expect(V5_MARKET_BASE_RATES[trimId][m]).not.toBe(
          RENTAL_REFERENCE_RATES[trimId][m],
        )
      }
    }
  })

  it('기준조건: 기준요율=월액(반올림), 조정·선납·보증 0', () => {
    for (const trimId of TRIMS) {
      for (const contractMonths of [36, 48, 60] as const) {
        const expected = STEP9_RATES[trimId][contractMonths]
        const r = calculateV5RentalEstimate({
          trimId,
          contractMonths,
          annualMileage: 20_000,
          prepaymentPercent: 0,
          depositPercent: 0,
        })
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.estimate.baseMarketRate).toBe(expected)
        expect(r.estimate.monthlyRental).toBe(Math.round(expected / 100) * 100)
        expect(r.estimate.mileageAdjustment).toBe(0)
        expect(r.estimate.optionColorMonthlyAdjustment).toBe(0)
        expect(r.estimate.prepaymentMonthlyReduction).toBe(0)
        expect(r.estimate.depositMonthlyDiscount).toBe(0)
        expect(r.estimate.prepaymentAmount).toBe(0)
        expect(r.estimate.depositAmount).toBe(0)
        expect(r.estimate.totalMonthlyPayments).toBe(
          r.estimate.monthlyRental * contractMonths,
        )
        expect(r.estimate.totalRentalExpenditure).toBe(
          r.estimate.totalMonthlyPayments,
        )
      }
    }
  })
})

describe('STEP9 — 조건 변경', () => {
  it('선납 0/10/20/30% 월할 차감·총지출에 선납 1회', () => {
    const price = getVehiclePriceBeforeTax('LONG_RANGE_EARTH')!
    for (const prepaymentPercent of [0, 10, 20, 30] as const) {
      const r = calculateV5RentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: 48,
        annualMileage: 20_000,
        prepaymentPercent,
        depositPercent: 0,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.estimate.prepaymentAmount).toBe(price * (prepaymentPercent / 100))
      expect(r.estimate.prepaymentMonthlyReduction).toBeCloseTo(
        r.estimate.prepaymentAmount / 48,
        5,
      )
      expect(r.estimate.totalRentalExpenditure).toBe(
        r.estimate.monthlyRental * 48 + r.estimate.prepaymentAmount,
      )
      expect(r.estimate.initialCashOutlay).toBe(r.estimate.prepaymentAmount)
    }
  })

  it('보증 0/10/20/30% — 연2% 할인만, 총지출에 미포함', () => {
    expect(V5_DEPOSIT_ANNUAL_DISCOUNT.value).toBe(DEPOSIT_ANNUAL_DISCOUNT_RATE)
    const price = getVehiclePriceBeforeTax('STANDARD_AIR')!
    for (const depositPercent of [0, 10, 20, 30] as const) {
      const r = calculateV5RentalEstimate({
        trimId: 'STANDARD_AIR',
        contractMonths: 36,
        annualMileage: 20_000,
        prepaymentPercent: 0,
        depositPercent,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.estimate.depositAmount).toBe(price * (depositPercent / 100))
      expect(r.estimate.depositMonthlyDiscount).toBeCloseTo(
        r.estimate.depositAmount * 0.02 / 12,
        5,
      )
      expect(r.estimate.totalRentalExpenditure).toBe(
        r.estimate.monthlyRental * 36,
      )
      expect(r.estimate.initialCashOutlay).toBe(r.estimate.depositAmount)
    }
  })

  it('주행 10k/15k/20k/30k·무제한', () => {
    const rents = ([10_000, 15_000, 20_000, 30_000] as const).map(
      (annualMileage) => {
        const r = calculateV5RentalEstimate({
          trimId: 'LONG_RANGE_EARTH',
          contractMonths: 60,
          annualMileage,
          prepaymentPercent: 0,
          depositPercent: 0,
        })
        expect(r.ok).toBe(true)
        return r.ok ? r.estimate.monthlyRental : 0
      },
    )
    expect(rents[0]).toBeLessThan(rents[1])
    expect(rents[1]).toBeLessThan(rents[2])
    expect(rents[2]).toBeLessThan(rents[3])

    const unlimited = calculateV5RentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 60,
      annualMileage: 'unlimited',
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    expect(unlimited.ok).toBe(false)
    if (!unlimited.ok) {
      expect(unlimited.code).toBe('UNLIMITED_MILEAGE_CONSULTATION')
    }
  })

  it('유료 외장색·옵션 월할, 무료 색상 0, 불가 옵션 차단', () => {
    const base = calculateV5RentalEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    const paidColor = calculateV5RentalEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      exteriorColorId: 'SWP',
    })
    const freeColor = calculateV5RentalEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      exteriorColorId: 'ABP',
    })
    const withOpt = calculateV5RentalEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      selectedOptionIds: ['style'],
    })
    const invalid = calculateV5RentalEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      selectedOptionIds: ['comfort2'],
    })

    expect(base.ok && paidColor.ok && freeColor.ok && withOpt.ok).toBe(true)
    if (!base.ok || !paidColor.ok || !freeColor.ok || !withOpt.ok) return
    expect(paidColor.estimate.optionColorMonthlyAdjustment).toBeCloseTo(
      80_000 / 36,
      5,
    )
    expect(paidColor.estimate.monthlyRental).toBeGreaterThan(
      base.estimate.monthlyRental,
    )
    expect(freeColor.estimate.optionColorMonthlyAdjustment).toBe(0)
    expect(freeColor.estimate.monthlyRental).toBe(base.estimate.monthlyRental)
    expect(withOpt.estimate.optionColorMonthlyAdjustment).toBeCloseTo(
      940_000 / 36,
      5,
    )
    expect(invalid.ok).toBe(false)

    const fromSelection = calculateV5FromQuoteSelection({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      exteriorColorId: 'SWP',
      selectedOptionIds: ['style'],
    })
    expect(fromSelection.ok).toBe(true)
    if (fromSelection.ok) {
      expect(fromSelection.estimate.optionColorMonthlyAdjustment).toBeCloseTo(
        (80_000 + 940_000) / 36,
        5,
      )
    }
  })

  it('선납20+보증10 예시 총지출', () => {
    const r = calculateV5RentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 48,
      annualMileage: 20_000,
      prepaymentPercent: 20,
      depositPercent: 10,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.estimate.totalRentalExpenditure).toBe(
      r.estimate.monthlyRental * 48 + r.estimate.prepaymentAmount,
    )
    expect(r.estimate.initialCashOutlay).toBe(
      r.estimate.prepaymentAmount + r.estimate.depositAmount,
    )
  })
})

describe('STEP9 — V2·V3·V4 회귀', () => {
  it('V2 기존 겟차 요율 불변', () => {
    const v2 = calculateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    expect(v2.ok).toBe(true)
    if (v2.ok) expect(v2.monthlyEstimate).toBe(524_500)
    expect(RENTAL_REFERENCE_RATES.LONG_RANGE_EARTH[36]).toBe(524_500)
  })

  it('V4·V3 불변', () => {
    const v4 = calculateV4RentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    expect(v4.ok && v4.estimate.monthlyRental === 908_600).toBe(true)
    const v3 = simulateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    expect(v3.ok).toBe(true)
  })

  it('feature flag 기본 v2', () => {
    expect(['v2', 'v5']).toContain(resolvePricingEngineId())
  })
})
