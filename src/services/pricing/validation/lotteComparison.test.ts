import { describe, expect, it } from 'vitest'
import { calculateV4RentalEstimate } from '../v4/calculator'
import {
  compareV4ToLotteReference,
  formatLotteComparisonLine,
  LOTTE_OBSERVED_QUOTES,
} from './lotteComparison'

describe('lotteComparison (validation only)', () => {
  it('관측 견적 12건(선택형6+인수형6)을 보유한다', () => {
    expect(LOTTE_OBSERVED_QUOTES).toHaveLength(12)
  })

  it('V4와 나란히 참고 차액을 출력한다(정확도 주장 없음)', () => {
    const v4 = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 48,
    })
    expect(v4.ok).toBe(true)
    if (!v4.ok) return

    const row = compareV4ToLotteReference({
      trimId: 'STANDARD_AIR',
      contractMonths: 48,
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      v4Monthly: v4.estimate.monthlyRental,
      productType: 'select_return_or_acquire',
    })
    expect(row).not.toBeNull()
    if (!row) return
    expect(row.lotteReferenceMonthly).toBe(588_500)
    expect(row.caveat).toMatch(/오차율이 아님/)
    const text = formatLotteComparisonLine(row)
    expect(text).toContain('V4 자체 계산금액')
    expect(text).toContain('롯데 참고금액')
    expect(text).toMatch(/정확도 아님|오차율이 아님/)
    expect(text).not.toMatch(/시장 정확도|검증된 오차율입니다/)
  })

  it('롯데 관측값 변경이 V4 계산을 바꾸지 않는다', () => {
    const before = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 36,
    })
    expect(before.ok).toBe(true)
    if (!before.ok) return

    const target = LOTTE_OBSERVED_QUOTES.find(
      (q) =>
        q.productType === 'select_return_or_acquire' &&
        q.prepaymentPercent === 0 &&
        q.contractMonths === 36,
    )
    expect(target).toBeTruthy()
    if (!target) return
    const original = target.monthlyRentObserved
    target.monthlyRentObserved = 1

    const after = calculateV4RentalEstimate({
      trimId: 'STANDARD_AIR',
      prepaymentPercent: 0,
      depositPercent: 0,
      annualMileage: 20_000,
      contractMonths: 36,
    })
    target.monthlyRentObserved = original

    expect(after.ok).toBe(true)
    if (!after.ok) return
    expect(after.estimate.monthlyRental).toBe(before.estimate.monthlyRental)
  })
})
