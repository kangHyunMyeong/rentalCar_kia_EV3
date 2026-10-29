import { describe, expect, it } from 'vitest'
import { calculateV4RentalEstimate } from '../v4/calculator'
import {
  assertResidualFixedWhenAcquisitionOnly,
  runVehicleCostScenario,
} from './acquisitionCostAnalysis'
import {
  buildEv3GtPerformanceSubsidyReference,
  buildEvSubsidyAssessment,
  mapTrimToAnnouncedNationalSubsidy,
} from './evSubsidyScenarios'
import {
  STEP72_CUSTOMER_COPY_PROPOSAL,
  STEP72_REFERENCE_MONTHLIES,
  analyzeWhyV4MayReadHigh,
  buildScenarioMonthlyTable,
  compareEnginesLongRangeEarthZeroPrepay,
  getOpsRecommendations,
  verifyOfficialPriceBookAgainstExpected,
} from './estimateRealityCheck'
import { buildCoreRealityScenarios } from './vehicleCostScenarios'

describe('STEP7.2 — 공식 가격 검증', () => {
  it('장부 = PDF 기대값 = 기아 공식 사이트 확인값', () => {
    const v = verifyOfficialPriceBookAgainstExpected()
    expect(v.allMatch).toBe(true)
    expect(v.rows).toHaveLength(6)
  })
})

describe('STEP7.2 — V4 회귀 보존', () => {
  it('시나리오 A = 기존 V4 월액', () => {
    for (const m of [36, 48, 60] as const) {
      const v4 = calculateV4RentalEstimate({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        annualMileage: 20_000,
        prepaymentPercent: 0,
        depositPercent: 0,
      })
      const a = runVehicleCostScenario({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        scenario: buildCoreRealityScenarios('LONG_RANGE_EARTH')[0],
      })
      expect(v4.ok && a.ok).toBe(true)
      if (v4.ok && a.ok) {
        expect(a.metrics.monthlyRental).toBe(v4.estimate.monthlyRental)
        expect(a.metrics.monthlyRental).toBe(
          STEP72_REFERENCE_MONTHLIES.LONG_RANGE_EARTH.A[m],
        )
      }
    }
  })
})

describe('STEP7.2 — 판매가·취득원가·잔가 분리', () => {
  it('취득원가 차감 시 잔가·판매가 고정', () => {
    expect(
      assertResidualFixedWhenAcquisitionOnly('LONG_RANGE_EARTH', 36, -5_000_000),
    ).toBe(true)
  })

  it('시나리오 B·C·D 월액 및 참고값 비교', () => {
    const scenarios = buildCoreRealityScenarios('LONG_RANGE_EARTH')
    const B = scenarios.find((s) => s.id === 'B_after_tax')!
    const C = scenarios.find((s) => s.id === 'C_after_tax_acq_5m')!
    const D = scenarios.find((s) => s.id === 'D_after_tax_acq_7m')!

    for (const m of [36, 48, 60] as const) {
      const b = runVehicleCostScenario({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        scenario: B,
      })
      const c = runVehicleCostScenario({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        scenario: C,
      })
      const d = runVehicleCostScenario({
        trimId: 'LONG_RANGE_EARTH',
        contractMonths: m,
        scenario: D,
      })
      expect(b.ok && c.ok && d.ok).toBe(true)
      if (!b.ok || !c.ok || !d.ok) return

      expect(b.metrics.monthlyRental).toBe(
        STEP72_REFERENCE_MONTHLIES.LONG_RANGE_EARTH.B[m],
      )
      // 프롬프트 “약” 값 — 반올림 차이 ±1,000 허용, 역산 보정 없음
      expect(
        Math.abs(
          c.metrics.monthlyRental -
            STEP72_REFERENCE_MONTHLIES.LONG_RANGE_EARTH.C_5m[m],
        ),
      ).toBeLessThanOrEqual(1_000)
      expect(
        Math.abs(
          d.metrics.monthlyRental -
            STEP72_REFERENCE_MONTHLIES.LONG_RANGE_EARTH.D_7m[m],
        ),
      ).toBeLessThanOrEqual(1_000)

      expect(c.bases.residualBasePrice).toBe(b.bases.residualBasePrice)
      expect(c.bases.referenceSalePrice).toBe(48_100_000)
      expect(c.bases.acquisitionCost).toBe(48_100_000 - 5_000_000)
      expect(d.metrics.monthlyRental).toBeLessThan(c.metrics.monthlyRental)
      expect(c.metrics.monthlyRental).toBeLessThan(b.metrics.monthlyRental)
    }
  })

  it('스탠다드 에어 세제후·가상 차감 참고', () => {
    const scenarios = buildCoreRealityScenarios('STANDARD_AIR')
    const B = scenarios.find((s) => s.id === 'B_after_tax')!
    const a4 = scenarios.find((s) => s.id === 'AIR_after_tax_acq_4m')!
    const a6 = scenarios.find((s) => s.id === 'AIR_after_tax_acq_6m')!
    for (const m of [36, 48, 60] as const) {
      const b = runVehicleCostScenario({
        trimId: 'STANDARD_AIR',
        contractMonths: m,
        scenario: B,
      })
      const r4 = runVehicleCostScenario({
        trimId: 'STANDARD_AIR',
        contractMonths: m,
        scenario: a4,
      })
      const r6 = runVehicleCostScenario({
        trimId: 'STANDARD_AIR',
        contractMonths: m,
        scenario: a6,
      })
      expect(b.ok && r4.ok && r6.ok).toBe(true)
      if (!b.ok || !r4.ok || !r6.ok) return
      expect(b.metrics.monthlyRental).toBe(
        STEP72_REFERENCE_MONTHLIES.STANDARD_AIR.B[m],
      )
      expect(
        Math.abs(
          r4.metrics.monthlyRental -
            STEP72_REFERENCE_MONTHLIES.STANDARD_AIR.acq_4m[m],
        ),
      ).toBeLessThanOrEqual(1_000)
      expect(
        Math.abs(
          r6.metrics.monthlyRental -
            STEP72_REFERENCE_MONTHLIES.STANDARD_AIR.acq_6m[m],
        ),
      ).toBeLessThanOrEqual(1_000)
    }
  })
})

describe('STEP7.2 — 보조금 상태 분리', () => {
  it('국비 공시와 패스스루 미검증 구분, GT≠GT-Line', () => {
    const lr = buildEvSubsidyAssessment('LONG_RANGE_EARTH')
    expect(lr.nationalSubsidy.amountWon).toBe(5_550_000)
    expect(lr.verifiedPassThroughAmount.certainty).toBe('unverified')
    expect(lr.hypotheticalPassThroughAmount.certainty).toBe(
      'hypothetical_only',
    )
    expect(lr.localSubsidy.certainty).toBe('unverified')
    expect(lr.isEv3GtPerformanceModel).toBe(false)

    const gt = buildEv3GtPerformanceSubsidyReference()
    expect(gt.isEv3GtPerformanceModel).toBe(true)
    expect(gt.nationalSubsidy.amountWon).toBe(2_480_000)
    expect(gt.warnings.some((w) => w.includes('GT-Line'))).toBe(true)

    expect(mapTrimToAnnouncedNationalSubsidy('STANDARD_AIR').amountWon).toBe(
      4_690_000,
    )
  })

  it('시나리오 E는 국비 가상 반영·verifiedIncentive=0', () => {
    const E = buildCoreRealityScenarios('LONG_RANGE_EARTH').find(
      (s) => s.id === 'E_after_tax_hypo_national_subsidy',
    )!
    expect(E.verifiedIncentive).toBe(0)
    expect(E.hypotheticalAcquisitionReduction).toBe(-5_550_000)
    const r = runVehicleCostScenario({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: 36,
      scenario: E,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.bases.referenceSalePrice).toBe(48_100_000)
      expect(r.bases.acquisitionCost).toBe(48_100_000 - 5_550_000)
      expect(r.metrics.residualValue).toBeCloseTo(48_100_000 * 0.58, 5)
    }
  })
})

describe('STEP7.2 — 엔진 비교·추천·문구', () => {
  it('V2·V3·V4 독립 비교', () => {
    const rows = compareEnginesLongRangeEarthZeroPrepay()
    expect(rows[0].v2).toBe(524_500)
    expect(rows[0].v4).toBe(908_600)
    expect(rows[0].v3).toBe(936_900)
  })

  it('운영 추천은 B안·승인 전 미적용', () => {
    const rec = getOpsRecommendations()
    expect(rec.expertPick).toBe('B_after_tax')
    expect(rec.applyOnlyAfterApproval).toBe(true)
    expect(analyzeWhyV4MayReadHigh().length).toBeGreaterThan(3)
    expect(STEP72_CUSTOMER_COPY_PROPOSAL.title).toBe('예상 월 렌트료')
  })

  it('6트림 시나리오 표 산출', () => {
    const table = buildScenarioMonthlyTable('LONG_RANGE_GT_LINE')
    expect(table.length).toBeGreaterThanOrEqual(5)
    expect(table[0].monthlies[36]).toBeGreaterThan(0)
  })
})
