import { describe, expect, it } from 'vitest'
import { DEFAULT_QUOTE_SELECTION } from '@/data/rental-conditions'
import { RENTAL_REFERENCE_RATES } from '@/data/rentalReferenceRates'
import { RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'
import type { QuoteSelection, TrimId } from '@/types'
import {
  calculateRentalEstimate,
  resolveRentalEstimate,
  roundMonthlyRent,
} from './calculateRentalEstimate'
import { toEstimateLeadSnapshot } from './toEstimateLeadSnapshot'

describe('roundMonthlyRent', () => {
  it('100원 단위로 Math.round 반올림한다', () => {
    expect(roundMonthlyRent(548_957)).toBe(549_000)
    expect(roundMonthlyRent(548_949)).toBe(548_900)
    expect(roundMonthlyRent(548_950)).toBe(549_000)
    expect(roundMonthlyRent(464_713)).toBe(464_700)
    expect(roundMonthlyRent(517_266)).toBe(517_300)
    expect(roundMonthlyRent(528_657)).toBe(528_700)
    expect(roundMonthlyRent(560_368)).toBe(560_400)
  })
})

describe('RENTAL_REFERENCE_RATES', () => {
  it('트림 6종 × 기간 3종 = 18개 기준 요율을 등록한다', () => {
    const trims = Object.keys(RENTAL_REFERENCE_RATES)
    expect(trims).toHaveLength(6)
    for (const trim of trims) {
      expect(RENTAL_REFERENCE_RATES[trim as TrimId][36]).toBeGreaterThan(0)
      expect(RENTAL_REFERENCE_RATES[trim as TrimId][48]).toBeGreaterThan(0)
      expect(RENTAL_REFERENCE_RATES[trim as TrimId][60]).toBeGreaterThan(0)
    }
  })

  it('세제혜택 전 차량가격 6종을 유지한다', () => {
    expect(RENTAL_VEHICLE_PRICES.LONG_RANGE_EARTH).toBe(50_600_000)
    expect(RENTAL_VEHICLE_PRICES.STANDARD_AIR).toBe(42_030_000)
  })
})

describe('calculateRentalEstimate V2', () => {
  const baseZero: QuoteSelection = {
    trimId: 'LONG_RANGE_EARTH',
    prepaymentPercent: 0,
    depositPercent: 0,
    annualMileage: 20_000,
    contractMonths: 60,
  }

  it('TEST01 LONG_RANGE_EARTH 60m → 549,000', () => {
    const result = calculateRentalEstimate(baseZero)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.breakdown.referenceMonthlyRate).toBe(548_957)
    expect(result.rawMonthlyRent).toBeCloseTo(548_957, 5)
    expect(result.roundedMonthlyRent).toBe(549_000)
    expect(result.meta.estimateStatus).toBe('public_reference')
  })

  it('TEST02 STANDARD_AIR 60m → 464,700', () => {
    const result = calculateRentalEstimate({ ...baseZero, trimId: 'STANDARD_AIR' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.breakdown.referenceMonthlyRate).toBe(464_713)
    expect(result.roundedMonthlyRent).toBe(464_700)
  })

  it('TEST03 STANDARD_EARTH 60m → 517,300', () => {
    const result = calculateRentalEstimate({ ...baseZero, trimId: 'STANDARD_EARTH' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.breakdown.referenceMonthlyRate).toBe(517_266)
    expect(result.roundedMonthlyRent).toBe(517_300)
  })

  it('TEST04 LONG_RANGE_GT_LINE 60m → 560,400', () => {
    const result = calculateRentalEstimate({ ...baseZero, trimId: 'LONG_RANGE_GT_LINE' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.breakdown.referenceMonthlyRate).toBe(560_368)
    expect(result.roundedMonthlyRent).toBe(560_400)
  })

  it('금융 5%·운영비 18만원을 기준 요율에 중복 가산하지 않는다', () => {
    const result = calculateRentalEstimate(baseZero)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rawMonthlyRent).toBeLessThan(600_000)
    expect(result.rawMonthlyRent).toBeCloseTo(548_957, 5)
  })

  it('선납금·보증금·주행거리·계약기간 변경 시 금액이 달라진다', () => {
    const base = calculateRentalEstimate(baseZero)
    expect(base.ok).toBe(true)
    if (!base.ok) return

    const variants: QuoteSelection[] = [
      { ...baseZero, prepaymentPercent: 30 },
      { ...baseZero, depositPercent: 20 },
      { ...baseZero, annualMileage: 10_000 },
      { ...baseZero, contractMonths: 36 },
    ]

    for (const selection of variants) {
      const result = calculateRentalEstimate(selection)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.roundedMonthlyRent).not.toBe(base.roundedMonthlyRent)
      expect(result.roundedMonthlyRent % 100).toBe(0)
    }
  })

  it('무제한 주행거리는 임의 금액을 만들지 않는다', () => {
    const result = calculateRentalEstimate({
      ...baseZero,
      annualMileage: 'unlimited',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('UNLIMITED_MILEAGE_CONSULTATION')
    expect(result.message).toContain('무제한')
    expect(result.meta.estimateStatus).toBe('consultation_required')
  })

  it('verified 모드에서는 public_reference를 사용하지 않는다', () => {
    const result = resolveRentalEstimate(baseZero, 'verified')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('VERIFIED_RATE_UNAVAILABLE')
  })
})

describe('toEstimateLeadSnapshot', () => {
  it('상담 스냅샷에 rounded·raw·status를 포함한다', () => {
    const selection: QuoteSelection = {
      ...DEFAULT_QUOTE_SELECTION,
      prepaymentPercent: 0,
      depositPercent: 0,
    }
    const estimate = calculateRentalEstimate(selection)
    const snapshot = toEstimateLeadSnapshot(selection, estimate)

    expect(snapshot.roundedMonthlyRent).toBe(549_000)
    expect(snapshot.estimatedMonthlyFee).toBe(549_000)
    expect(snapshot.rawMonthlyRent).toBeCloseTo(548_957, 5)
    expect(snapshot.estimateStatus).toBe('public_reference')
    expect(snapshot.referenceVersion).toBeTruthy()
    expect(snapshot.estimateCalculatedAt).toBeTruthy()
  })
})
