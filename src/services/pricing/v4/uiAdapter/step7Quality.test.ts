import { describe, expect, it } from 'vitest'
import { RENTAL_CONDITIONS } from '@/data/rental-conditions'
import { RENTAL_VEHICLE_PRICE_BOOK } from '@/data/rentalVehiclePriceBook'
import { RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'
import type { TrimId } from '@/types'
import { calculateRentalEstimate } from '../../calculateRentalEstimate'
import { simulateRentalEstimate } from '../../simulation/simulateRentalEstimate'
import { calculateV4RentalEstimate } from '../calculator'
import { validateEv3OptionSelection } from '../vehiclePrice'
import { V4_UI_COPY } from './copy'
import { diagnoseV4Estimate } from './diagnostics'
import {
  normalizeQuoteSelectionToV4UiInput,
  toV4UiEstimate,
  toV4UiEstimateFromQuoteSelection,
} from './toV4UiEstimate'

const TRIMS = Object.keys(RENTAL_VEHICLE_PRICES) as TrimId[]
const TERMS = RENTAL_CONDITIONS.contractMonths
const PREPAYS = RENTAL_CONDITIONS.prepaymentPercents
const DEPOSITS = RENTAL_CONDITIONS.depositPercents
const MILEAGES = RENTAL_CONDITIONS.annualMileages.filter(
  (m): m is Exclude<typeof m, 'unlimited'> => m !== 'unlimited',
)

const PDF_PRICES: Record<TrimId, { before: number; after: number }> = {
  STANDARD_AIR: { before: 42_030_000, after: 39_950_000 },
  STANDARD_EARTH: { before: 46_180_000, after: 43_900_000 },
  STANDARD_GT_LINE: { before: 47_080_000, after: 44_750_000 },
  LONG_RANGE_AIR: { before: 46_450_000, after: 44_150_000 },
  LONG_RANGE_EARTH: { before: 50_600_000, after: 48_100_000 },
  LONG_RANGE_GT_LINE: { before: 51_500_000, after: 48_950_000 },
}

describe('STEP7 — PDF 차량가격', () => {
  it('6개 트림 세제전/후가 PDF·장부와 일치', () => {
    for (const trimId of TRIMS) {
      const book = RENTAL_VEHICLE_PRICE_BOOK[trimId]
      const expect_ = PDF_PRICES[trimId]
      expect(book.vehiclePriceBeforeTaxBenefit).toBe(expect_.before)
      expect(book.vehiclePriceAfterTaxBenefit).toBe(expect_.after)
      expect(RENTAL_VEHICLE_PRICES[trimId]).toBe(expect_.before)
    }
  })
})

describe('STEP7 — 옵션·색상 입력 반영', () => {
  it('옵션·외장색 추가 시 차량가·월액 상승', () => {
    const base = toV4UiEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 48,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    const withExtras = toV4UiEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 48,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      selectedOptionIds: ['style', 'comfort1'],
      exteriorColorId: 'SWP',
    })
    expect(base.ok && withExtras.ok).toBe(true)
    expect(withExtras.viewModel.pricing!.vehiclePrice).toBe(
      42_030_000 + 940_000 + 490_000 + 80_000,
    )
    expect(withExtras.viewModel.pricing!.monthlyRent).toBeGreaterThan(
      base.viewModel.pricing!.monthlyRent,
    )
  })

  it('validateEv3OptionSelection 재사용 — 불가 조합 차단', () => {
    expect(
      validateEv3OptionSelection('STANDARD_AIR', ['comfort2']).length,
    ).toBeGreaterThan(0)
    const blocked = toV4UiEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      selectedOptionIds: ['comfort2'],
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.viewModel.validation.requiresReview).toBe(true)
    expect(
      blocked.viewModel.validation.diagnostics.some(
        (d) => d.code === 'invalid_options',
      ),
    ).toBe(true)
  })
})

describe('STEP7 — 회귀 기준값', () => {
  it('롱레인지 어스·스탠다드 에어 무선납', () => {
    const lr: Record<36 | 48 | 60, number> = {
      36: 908_600,
      48: 827_400,
      60: 768_400,
    }
    const air: Record<36 | 48 | 60, number> = {
      36: 780_400,
      48: 712_900,
      60: 663_900,
    }
    for (const m of TERMS) {
      const a = toV4UiEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        annualMileage: 20_000,
        prepaymentPercent: 0,
        depositPercent: 0,
      })
      const b = toV4UiEstimate({
        trimId: 'STANDARD_AIR',
        contractMonths: m,
        annualMileage: 20_000,
        prepaymentPercent: 0,
        depositPercent: 0,
      })
      expect(a.viewModel.monthlyRentDisplay).toBe(lr[m])
      expect(b.viewModel.monthlyRentDisplay).toBe(air[m])
    }
  })

  it('고선납 30% 기간 역전 허용', () => {
    const expected = { 36: 455_300, 48: 479_500, 60: 483_700 }
    const rents = TERMS.map((m) => {
      const r = toV4UiEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        annualMileage: 20_000,
        prepaymentPercent: 30,
        depositPercent: 0,
      })
      expect(r.ok).toBe(true)
      return r.viewModel.monthlyRentDisplay!
    })
    expect(rents).toEqual([expected[36], expected[48], expected[60]])
    expect(rents[0]).toBeLessThan(rents[2])
  })
})

describe('STEP7 — 선납·보증 구분', () => {
  const cases = [
    { depositPercent: 0, prepaymentPercent: 0 },
    { depositPercent: 10, prepaymentPercent: 0 },
    { depositPercent: 0, prepaymentPercent: 10 },
    { depositPercent: 10, prepaymentPercent: 10 },
    { depositPercent: 20, prepaymentPercent: 20 },
    { depositPercent: 30, prepaymentPercent: 30 },
  ] as const

  it('보증금은 자본 미차감·할인만, 선납은 자본 차감', () => {
    for (const c of cases) {
      const r = calculateV4RentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: 48,
        annualMileage: 20_000,
        ...c,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      const price = 50_600_000
      expect(r.estimate.prepaymentAmount).toBe(price * (c.prepaymentPercent / 100))
      expect(r.estimate.depositAmount).toBe(price * (c.depositPercent / 100))
      expect(r.estimate.financedCapital).toBe(
        price - r.estimate.prepaymentAmount,
      )
      // 보증금이 금융원금에 더해지지 않음
      expect(r.estimate.financedCapital + r.estimate.prepaymentAmount).toBe(price)
    }
  })

  it('동일 %라도 보증만 vs 선납만 월액 다름', () => {
    const depOnly = toV4UiEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 20,
    })
    const prepOnly = toV4UiEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 20,
      depositPercent: 0,
    })
    expect(depOnly.ok && prepOnly.ok).toBe(true)
    expect(depOnly.viewModel.monthlyRentDisplay).not.toBe(
      prepOnly.viewModel.monthlyRentDisplay,
    )
    expect(prepOnly.viewModel.monthlyRentDisplay!).toBeLessThan(
      depOnly.viewModel.monthlyRentDisplay!,
    )
  })
})

describe('STEP7 — 전수 조합 수학 검증', () => {
  it('전 트림·기간·선납·보증·주행(유한)에서 유한 숫자·총지출 일관', () => {
    let count = 0
    for (const trimId of TRIMS) {
      for (const contractMonths of TERMS) {
        for (const prepaymentPercent of PREPAYS) {
          for (const depositPercent of DEPOSITS) {
            for (const annualMileage of MILEAGES) {
              const ui = toV4UiEstimate({
                trimId,
                contractMonths,
                prepaymentPercent,
                depositPercent,
                annualMileage,
              })
              expect(ui.ok).toBe(true)
              const p = ui.viewModel.pricing!
              const b = ui.viewModel.breakdown!
              expect(Number.isFinite(p.monthlyRent)).toBe(true)
              expect(Number.isFinite(b.depreciation)).toBe(true)
              expect(Number.isFinite(b.financing)).toBe(true)
              expect(p.monthlyRent).toBe(ui.viewModel.monthlyRentDisplay)
              expect(p.totalMonthlyPayments).toBe(
                p.monthlyRent * contractMonths,
              )
              expect(p.totalPayment).toBe(
                p.totalMonthlyPayments + p.prepaymentAmount,
              )
              expect(p.initialCashOutlay).toBe(
                p.prepaymentAmount + p.depositAmount,
              )
              // 보증금을 총지출(선납 포함)에 넣지 않음
              expect(p.totalPayment).toBe(
                p.monthlyRent * contractMonths + p.prepaymentAmount,
              )
              count++
            }
          }
        }
      }
    }
    expect(count).toBe(
      TRIMS.length * TERMS.length * PREPAYS.length * DEPOSITS.length * MILEAGES.length,
    )
  })

  it('어댑터 결과가 동일 입력 V4와 일치', () => {
    const input = {
      trimId: 'LONG_RANGE_GT_LINE' as const,
      contractMonths: 60 as const,
      annualMileage: 15_000 as const,
      prepaymentPercent: 10 as const,
      depositPercent: 20 as const,
    }
    const v4 = calculateV4RentalEstimate(input)
    const ui = toV4UiEstimate(input)
    expect(v4.ok && ui.ok).toBe(true)
    if (!v4.ok || !ui.ok) return
    expect(ui.viewModel.monthlyRentDisplay).toBe(v4.estimate.monthlyRental)
    expect(ui.viewModel.pricing!.vehiclePrice).toBe(
      v4.estimate.calculationVehiclePrice,
    )
    expect(ui.viewModel.breakdown!.depreciation).toBe(
      v4.estimate.monthlyDepreciation,
    )
  })
})

describe('STEP7 — 극단·requiresReview', () => {
  it('고선납+고잔가 위험 시 requiresReview·하한 보정 없음', () => {
    // 선납 30% · 잔가율 58% → financed < residual 가능
    const r = calculateV4RentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 36,
      annualMileage: 10_000, // 잔가 +4%p → 0.62
      prepaymentPercent: 30,
      depositPercent: 0,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const d = diagnoseV4Estimate(r)
    if (r.estimate.financedCapital < r.estimate.residualValue) {
      expect(d.requiresReview).toBe(true)
      expect(
        d.diagnostics.some((x) => x.code === 'financed_capital_below_residual'),
      ).toBe(true)
    }
    // 임의 Math.max 하한 없음 — 계산값 그대로
    expect(r.estimate.monthlyRental).toBe(
      Math.round(r.estimate.rawMonthlyRental / 100) * 100,
    )
  })

  it('무제한 주행은 숫자 null + requiresReview', () => {
    const ui = toV4UiEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 'unlimited',
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    expect(ui.ok).toBe(false)
    expect(ui.viewModel.monthlyRentDisplay).toBeNull()
    expect(ui.viewModel.validation.requiresReview).toBe(true)
  })

  it('최저·최고 차량가 트림 계산 가능', () => {
    const low = toV4UiEstimate({
      trimId: 'STANDARD_AIR',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    const high = toV4UiEstimate({
      trimId: 'LONG_RANGE_GT_LINE',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      selectedOptionIds: ['dualMotor4wd', 'driveWise', 'monitoring'],
    })
    expect(low.ok && high.ok).toBe(true)
    expect(high.viewModel.pricing!.monthlyRent).toBeGreaterThan(
      low.viewModel.pricing!.monthlyRent,
    )
  })
})

describe('STEP7 — 출력 구조·문구·evidence', () => {
  it('뷰모델 필수 블록·evidence·copyKeys', () => {
    const ui = toV4UiEstimateFromQuoteSelection({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 60,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    expect(ui.ok).toBe(true)
    const vm = ui.viewModel
    expect(vm.estimateType).toBe('estimated')
    expect(vm.pricing!.monthlyRent).toBe(768_400)
    expect(vm.pricing!.totalPayment).toBe(768_400 * 60)
    expect(vm.breakdown!.insurance).toBe(120_000)
    expect(vm.breakdown!.verifiedPromotion).toBeNull()
    expect(vm.evidence.vehiclePrice).toBe('official_verified')
    expect(vm.evidence.residual).toBe('internal_assumption')
    expect(vm.evidence.subsidy).toBe('unverified')
    expect(vm.evidence.acquisitionCost).toBe('unverified')
    expect(vm.copyKeys.title).toBe('estimated_monthly_rent')
    expect(V4_UI_COPY.title).toBe('예상 월 렌트료')
    expect(V4_UI_COPY.cta).toContain('상담')
    expect(vm.monthlyRentFormatted).toContain('768,400')
  })

  it('normalizeQuoteSelectionToV4UiInput', () => {
    const n = normalizeQuoteSelectionToV4UiInput({
      trimId: 'STANDARD_EARTH',
      contractMonths: 48,
      annualMileage: 30_000,
      prepaymentPercent: 10,
      depositPercent: 20,
    })
    expect(n.trimId).toBe('STANDARD_EARTH')
    expect(n.selectedOptionIds).toEqual([])
  })
})

describe('STEP7 — V2·V4 독립 비교(보정 없음)', () => {
  it('동일 조건 월액 차이 확인 — 상호 보정 금지', () => {
    for (const m of TERMS) {
      const v2 = calculateRentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        annualMileage: 20_000,
        prepaymentPercent: 0,
        depositPercent: 0,
      })
      const v4 = calculateV4RentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        annualMileage: 20_000,
        prepaymentPercent: 0,
        depositPercent: 0,
      })
      expect(v2.ok && v4.ok).toBe(true)
      if (!v2.ok || !v4.ok) return
      if (m === 36) {
        expect(v2.monthlyEstimate).toBe(524_500)
        expect(v4.estimate.monthlyRental).toBe(908_600)
      }
      if (m === 48) {
        expect(v2.monthlyEstimate).toBe(536_900)
        expect(v4.estimate.monthlyRental).toBe(827_400)
      }
      if (m === 60) {
        expect(v2.monthlyEstimate).toBe(549_000)
        expect(v4.estimate.monthlyRental).toBe(768_400)
      }
      // V2는 기간↑ 월액↑, V4는 기간↑ 월액↓ (구조 차이)
      expect(v4.estimate.monthlyRental).not.toBe(v2.monthlyEstimate)
    }
  })

  it('V3 회귀 스모크', () => {
    const v3 = simulateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 36,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    expect(v3.ok).toBe(true)
    if (v3.ok) expect(v3.monthlyEstimate).toBe(936_900)
  })
})

describe('STEP7 — 주행거리', () => {
  it('주행↑ 월액↑ (잔가 가감)', () => {
    const rents = MILEAGES.map((annualMileage) => {
      const r = toV4UiEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: 48,
        annualMileage,
        prepaymentPercent: 0,
        depositPercent: 0,
      })
      expect(r.ok).toBe(true)
      return r.viewModel.monthlyRentDisplay!
    })
    for (let i = 1; i < rents.length; i++) {
      expect(rents[i]).toBeGreaterThan(rents[i - 1])
    }
  })
})
