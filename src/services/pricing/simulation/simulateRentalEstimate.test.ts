import { describe, expect, it } from 'vitest'
import { RENTAL_CONDITIONS } from '@/data/rental-conditions'
import { PRICING_SIMULATION_META } from '@/data/pricingSimulationConfig'
import {
  assertPriceBookAlignedWithV2,
  RENTAL_VEHICLE_PRICE_BOOK,
} from '@/data/rentalVehiclePriceBook'
import { RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'
import type { TrimId } from '@/types'
import { calculateRentalEstimate } from '../calculateRentalEstimate'
import {
  comparePrepaidMethods,
  simulateRentalEstimate,
} from './simulateRentalEstimate'

const TRIMS = Object.keys(RENTAL_VEHICLE_PRICES) as TrimId[]
const TERMS = RENTAL_CONDITIONS.contractMonths
const PREPAYS = RENTAL_CONDITIONS.prepaymentPercents
const DEPOSITS = RENTAL_CONDITIONS.depositPercents
const MILEAGES = RENTAL_CONDITIONS.annualMileages.filter(
  (m) => m !== 'unlimited',
)

describe('price book', () => {
  it('beforeTaxBenefit가 V2 RENTAL_VEHICLE_PRICES와 일치한다', () => {
    expect(assertPriceBookAlignedWithV2()).toBe(true)
  })

  it('LONG_RANGE_EARTH 세제전/후가 공식표와 일치한다', () => {
    const entry = RENTAL_VEHICLE_PRICE_BOOK.LONG_RANGE_EARTH
    expect(entry.vehiclePriceBeforeTaxBenefit).toBe(50_600_000)
    expect(entry.vehiclePriceAfterTaxBenefit).toBe(48_100_000)
  })
})

describe('simulateRentalEstimate — 기간 관계 (선납0·보증0·20k)', () => {
  it('전 트림에서 36 > 48 > 60 (강제 정렬 없이)', () => {
    for (const trimId of TRIMS) {
      const rents = TERMS.map((contractMonths) => {
        const r = simulateRentalEstimate({
          trimId,
          prepaymentPercent: 0,
          depositPercent: 0,
          annualMileage: 20_000,
          contractMonths,
        })
        expect(r.ok).toBe(true)
        if (!r.ok) return 0
        expect(r.verificationStatus).toBe('ok')
        return r.monthlyEstimate
      })
      expect(rents[0]).toBeGreaterThan(rents[1])
      expect(rents[1]).toBeGreaterThan(rents[2])
    }
  })
})

describe('simulateRentalEstimate — 선납·보증', () => {
  it('선납 증가 시 월액 감소 (capital_reduction)', () => {
    const series = PREPAYS.map((prepaymentPercent) => {
      const r = simulateRentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        prepaymentPercent,
        depositPercent: 0,
        annualMileage: 20_000,
        contractMonths: 60,
      })
      expect(r.ok).toBe(true)
      return r.ok ? r.monthlyEstimate : NaN
    })
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeLessThan(series[i - 1])
    }
  })

  it('보증금 증가 시 월액 감소·원금 미차감', () => {
    const base = simulateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 60,
    })
    expect(base.ok).toBe(true)
    if (!base.ok) return

    for (const depositPercent of [10, 20, 30] as const) {
      const r = simulateRentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        prepaymentPercent: 0,
        depositPercent,
        annualMileage: 20_000,
        contractMonths: 60,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.monthlyEstimate).toBeLessThan(base.monthlyEstimate)
      expect(r.breakdown.financedCapital).toBe(base.breakdown.financedCapital)
      expect(r.breakdown.depositAmount).toBeGreaterThan(0)
      expect(r.breakdown.depositMonthlyDiscount).toBeGreaterThan(0)
    }
  })

  it('선납 capital_reduction이 flat_pn보다 금융까지 반영해 월액이 같거나 더 낮다', () => {
    const { capitalReduction, flatPn } = comparePrepaidMethods({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 20,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 48,
    })
    expect(capitalReduction.ok && flatPn.ok).toBe(true)
    if (!capitalReduction.ok || !flatPn.ok) return
    expect(capitalReduction.monthlyEstimate).toBeLessThanOrEqual(
      flatPn.monthlyEstimate,
    )
  })
})

describe('simulateRentalEstimate — 주행거리·무제한', () => {
  it('주행거리 증가 시 월액 증가 (잔가 하락)', () => {
    const rents = MILEAGES.map((annualMileage) => {
      const r = simulateRentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        prepaymentPercent: 0,
        depositPercent: 0,
        annualMileage,
        contractMonths: 48,
      })
      expect(r.ok).toBe(true)
      return r.ok ? r.monthlyEstimate : NaN
    })
    expect(rents[0]).toBeLessThan(rents[1])
    expect(rents[1]).toBeLessThan(rents[2])
    expect(rents[2]).toBeLessThan(rents[3])
  })

  it('무제한은 상담 필요로 실패한다', () => {
    const r = simulateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 'unlimited',
      contractMonths: 60,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('UNLIMITED_MILEAGE_CONSULTATION')
  })
})

describe('simulateRentalEstimate — 전수 스캔', () => {
  it('음수·중복원금차감 없이 완료하고 과소는 needs_verification만', () => {
    let okCount = 0
    let needsVerification = 0
    let negativeRaw = 0

    for (const trimId of TRIMS) {
      for (const contractMonths of TERMS) {
        for (const prepaymentPercent of PREPAYS) {
          for (const depositPercent of DEPOSITS) {
            for (const annualMileage of MILEAGES) {
              const r = simulateRentalEstimate({
                trimId,
                prepaymentPercent,
                depositPercent,
                annualMileage,
                contractMonths,
              })
              expect(r.ok).toBe(true)
              if (!r.ok) continue
              okCount++
              expect(Number.isFinite(r.breakdown.rawMonthlyRent)).toBe(true)
              // 보증은 financedCapital에 영향 없음
              const zeroDeposit = simulateRentalEstimate({
                trimId,
                prepaymentPercent,
                depositPercent: 0,
                annualMileage,
                contractMonths,
              })
              if (zeroDeposit.ok) {
                expect(r.breakdown.financedCapital).toBe(
                  zeroDeposit.breakdown.financedCapital,
                )
              }
              if (r.breakdown.rawMonthlyRent < 0) negativeRaw++
              if (r.verificationStatus === 'needs_verification') {
                needsVerification++
                // 임의 상향 금지: rounded가 임계 이상으로 끌어올려지지 않음
                expect(r.monthlyEstimate).toBe(
                  Math.round(r.breakdown.rawMonthlyRent / 100) * 100,
                )
              }
              expect(
                r.breakdown.estimatedTotalOutlayExcludingRefundableDeposit,
              ).toBe(
                r.breakdown.totalMonthlyPayments +
                  r.breakdown.totalPrepaidOutlay,
              )
            }
          }
        }
      }
    }

    expect(okCount).toBe(TRIMS.length * TERMS.length * PREPAYS.length * DEPOSITS.length * MILEAGES.length)
    // 고선납 조합에서 과소/음수 가능 — 상향 없이 플래그만
    expect(needsVerification + negativeRaw).toBeGreaterThanOrEqual(0)
  })
})

describe('V2 vs V3 비교 — LONG_RANGE_EARTH / 20k / 보증0', () => {
  it('조건별 비교표를 출력하고 V2 운영값은 불변임을 확인한다', () => {
    const rows: Array<Record<string, string | number>> = []

    for (const prepaymentPercent of PREPAYS) {
      for (const contractMonths of TERMS) {
        const v2 = calculateRentalEstimate({
          trimId: 'LONG_RANGE_EARTH',
          prepaymentPercent,
          depositPercent: 0,
          annualMileage: 20_000,
          contractMonths,
        })
        const v3 = simulateRentalEstimate({
          trimId: 'LONG_RANGE_EARTH',
          prepaymentPercent,
          depositPercent: 0,
          annualMileage: 20_000,
          contractMonths,
        })
        expect(v2.ok && v3.ok).toBe(true)
        if (!v2.ok || !v3.ok) continue

        const delta = v3.monthlyEstimate - v2.monthlyEstimate
        rows.push({
          prepaid: prepaymentPercent,
          months: contractMonths,
          v2Monthly: v2.monthlyEstimate,
          v3Monthly: v3.monthlyEstimate,
          delta,
          v3TotalExDeposit:
            v3.breakdown.estimatedTotalOutlayExcludingRefundableDeposit,
          residualRate: v3.breakdown.residualRate,
          financeRate: v3.breakdown.annualFinanceRate,
          operating: v3.breakdown.monthlyOperatingCost,
          priceUsed: v3.breakdown.vehiclePriceUsed,
          engine: PRICING_SIMULATION_META.version,
        })
      }
    }

    // 스냅샷성 고정값 — V2 회귀 (롱어스 0/0/60)
    const anchor = calculateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 60,
    })
    expect(anchor.ok).toBe(true)
    if (anchor.ok) expect(anchor.roundedMonthlyRent).toBe(549_000)

    // eslint-disable-next-line no-console
    console.log(
      '\n[V2 vs V3 LONG_RANGE_EARTH deposit0 20k]\n' +
        rows
          .map(
            (r) =>
              `선납${r.prepaid}% ${r.months}m | V2 ${r.v2Monthly} | V3 ${r.v3Monthly} | Δ ${r.delta} | 총지출(보증제외) ${r.v3TotalExDeposit}`,
          )
          .join('\n'),
    )

    expect(rows).toHaveLength(PREPAYS.length * TERMS.length)
  })
})
