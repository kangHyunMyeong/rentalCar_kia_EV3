import { describe, expect, it } from 'vitest'
import { DEFAULT_QUOTE_SELECTION } from '@/data/rental-conditions'
import { RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'
import type { QuoteSelection, TrimId } from '@/types'
import {
  calculateRentalEstimate,
  resolveRentalEstimate,
  resolveResidualValueRate,
} from './calculateRentalEstimate'
import { toEstimateLeadSnapshot } from './toEstimateLeadSnapshot'

describe('RENTAL_VEHICLE_PRICES', () => {
  it('세제혜택 전 판매가격 6종을 등록한다', () => {
    expect(RENTAL_VEHICLE_PRICES.STANDARD_AIR).toBe(42_030_000)
    expect(RENTAL_VEHICLE_PRICES.STANDARD_EARTH).toBe(46_180_000)
    expect(RENTAL_VEHICLE_PRICES.STANDARD_GT_LINE).toBe(47_080_000)
    expect(RENTAL_VEHICLE_PRICES.LONG_RANGE_AIR).toBe(46_450_000)
    expect(RENTAL_VEHICLE_PRICES.LONG_RANGE_EARTH).toBe(50_600_000)
    expect(RENTAL_VEHICLE_PRICES.LONG_RANGE_GT_LINE).toBe(51_500_000)
  })
})

describe('calculateRentalEstimate', () => {
  it('기본 조건에서 약 701,813원 → 천 원 반올림 702,000원을 반환한다', () => {
    const result = calculateRentalEstimate(DEFAULT_QUOTE_SELECTION)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.breakdown.vehiclePriceBeforeTax).toBe(50_600_000)
    expect(result.breakdown.residualValueRate).toBe(0.45)
    expect(Math.round(result.breakdown.monthlyEstimateRaw)).toBe(701_813)
    expect(result.monthlyEstimate).toBe(702_000)
    expect(result.meta.pricingMode).toBe('simulation')
  })

  it('트림 변경 시 차량가격·월 예상료가 변경된다', () => {
    const earth = calculateRentalEstimate(DEFAULT_QUOTE_SELECTION)
    const air = calculateRentalEstimate({
      ...DEFAULT_QUOTE_SELECTION,
      trimId: 'STANDARD_AIR',
    })

    expect(earth.ok && air.ok).toBe(true)
    if (!earth.ok || !air.ok) return

    expect(air.breakdown.vehiclePriceBeforeTax).toBe(42_030_000)
    expect(air.monthlyEstimate).not.toBe(earth.monthlyEstimate)
    expect(air.monthlyEstimate).toBeLessThan(earth.monthlyEstimate)
  })

  it('선납금·보증금·주행거리·계약기간 변경 시 금액이 달라진다', () => {
    const base = calculateRentalEstimate(DEFAULT_QUOTE_SELECTION)
    expect(base.ok).toBe(true)
    if (!base.ok) return

    const variants: QuoteSelection[] = [
      { ...DEFAULT_QUOTE_SELECTION, prepaymentPercent: 30 },
      { ...DEFAULT_QUOTE_SELECTION, depositPercent: 20 },
      { ...DEFAULT_QUOTE_SELECTION, annualMileage: 10000 },
      { ...DEFAULT_QUOTE_SELECTION, annualMileage: 'unlimited' },
      { ...DEFAULT_QUOTE_SELECTION, contractMonths: 36 },
    ]

    for (const selection of variants) {
      const result = calculateRentalEstimate(selection)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.monthlyEstimate).not.toBe(base.monthlyEstimate)
      expect(Number.isFinite(result.monthlyEstimate)).toBe(true)
      expect(result.monthlyEstimate).toBeGreaterThan(0)
    }
  })

  it('무제한 주행거리 잔존가치 조정을 적용한다', () => {
    expect(resolveResidualValueRate(60, 'unlimited')).toBeCloseTo(0.37)
  })

  it('존재하지 않는 트림이면 금액을 만들지 않는다', () => {
    const result = calculateRentalEstimate({
      ...DEFAULT_QUOTE_SELECTION,
      trimId: 'UNKNOWN_TRIM' as TrimId,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toBe('견적 데이터 확인 필요')
    expect(result.code).toBe('UNKNOWN_TRIM')
  })

  it('잘못된 계약개월이면 오류 상태를 반환한다', () => {
    const result = calculateRentalEstimate({
      ...DEFAULT_QUOTE_SELECTION,
      contractMonths: 24 as QuoteSelection['contractMonths'],
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('INVALID_CONTRACT_MONTHS')
  })

  it('NaN·Infinity·0원을 성공 금액으로 반환하지 않는다', () => {
    const result = calculateRentalEstimate(DEFAULT_QUOTE_SELECTION)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Number.isFinite(result.monthlyEstimate)).toBe(true)
    expect(result.monthlyEstimate).not.toBe(0)
  })
})

describe('resolveRentalEstimate', () => {
  it('verified 모드에서는 simulation 가정값을 사용하지 않는다', () => {
    const result = resolveRentalEstimate(DEFAULT_QUOTE_SELECTION, 'verified')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('VERIFIED_RATE_UNAVAILABLE')
    expect(result.message).toBe('견적 데이터 확인 필요')
    expect(result.meta.pricingMode).toBe('verified')
  })
})

describe('toEstimateLeadSnapshot', () => {
  it('상담 신청 스냅샷에 계산 기준을 포함한다', () => {
    const estimate = calculateRentalEstimate(DEFAULT_QUOTE_SELECTION)
    const snapshot = toEstimateLeadSnapshot(DEFAULT_QUOTE_SELECTION, estimate)

    expect(snapshot.trimId).toBe('LONG_RANGE_EARTH')
    expect(snapshot.vehiclePriceBeforeTax).toBe(50_600_000)
    expect(snapshot.prepaymentPercent).toBe(10)
    expect(snapshot.depositPercent).toBe(0)
    expect(snapshot.annualMileage).toBe(20000)
    expect(snapshot.contractMonths).toBe(60)
    expect(snapshot.estimatedMonthlyFee).toBe(702_000)
    expect(snapshot.pricingMode).toBe('simulation')
    expect(snapshot.pricingVersion).toBeTruthy()
    expect(snapshot.isSimulation).toBe(true)
  })
})
