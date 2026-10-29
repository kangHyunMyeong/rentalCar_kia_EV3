import { describe, expect, it } from 'vitest'
import { calculateV4RentalEstimate } from '../v4/calculator'
import {
  V4_ANNUAL_FINANCE_RATE_BY_TERM,
  V4_MONTHLY_INSURANCE,
  V4_MONTHLY_MAINTENANCE,
  V4_RESIDUAL_RATE_BY_TERM,
} from '../v4/config'
import {
  analyzeTermOrder,
  applySensitivityOverrides,
  assertDefaultV4Unchanged,
  buildLotteReferenceComparisonTable,
  buildPrepaymentMatrix,
  calculateWithConfigSnapshot,
  compareVehiclePriceVsAcquisitionDiscount,
  getVatAndTaxAnalysisNotes,
  rankFactorImpacts,
  runBaselineSensitivity,
  runSensitivityScenario,
  snapshotDefaultV4Config,
} from './sensitivityCalculator'
import {
  buildAcquisitionDeltaScenarios,
  buildAcquisitionDiscountOnlyScenarios,
  buildFinanceScenarios,
  buildInsuranceScenarios,
  buildMaintenanceScenarios,
  buildResidualScenarios,
  buildVehiclePriceBasisScenarios,
  buildVehiclePriceChangeScenarios,
  CONTRACT_MONTHS,
  PREPAYMENT_PERCENTS,
} from './sensitivityScenarios'
import type { V4EstimateInput } from '../v4/types'

const BASE_LR: V4EstimateInput = {
  trimId: 'LONG_RANGE_EARTH',
  annualMileage: 20_000,
  prepaymentPercent: 0,
  depositPercent: 0,
  contractMonths: 36,
}

const BASE_AIR: V4EstimateInput = {
  trimId: 'STANDARD_AIR',
  annualMileage: 20_000,
  prepaymentPercent: 0,
  depositPercent: 0,
  contractMonths: 36,
}

describe('STEP6 — V4 기준값 재현', () => {
  it('롱레인지 어스 0% 선납·보증 월액이 STEP5와 일치', () => {
    const expected: Record<36 | 48 | 60, number> = {
      36: 908_600,
      48: 827_400,
      60: 768_400,
    }
    for (const m of CONTRACT_MONTHS) {
      const r = calculateV4RentalEstimate({ ...BASE_LR, contractMonths: m })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.estimate.monthlyRental).toBe(expected[m])
    }
  })

  it('스탠다드 에어 0% 선납·보증 월액이 STEP5와 일치', () => {
    const expected: Record<36 | 48 | 60, number> = {
      36: 780_400,
      48: 712_900,
      60: 663_900,
    }
    for (const m of CONTRACT_MONTHS) {
      const r = calculateV4RentalEstimate({ ...BASE_AIR, contractMonths: m })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.estimate.monthlyRental).toBe(expected[m])
    }
  })
})

describe('STEP6 — 기본값 보존', () => {
  it('분석 스냅샷 변조 후에도 V4 원본 월액·설정 불변', () => {
    const guard = assertDefaultV4Unchanged(BASE_LR)
    expect(guard.ok).toBe(true)
    expect(V4_RESIDUAL_RATE_BY_TERM.value[36]).toBe(0.58)
    expect(V4_RESIDUAL_RATE_BY_TERM.value[48]).toBe(0.51)
    expect(V4_RESIDUAL_RATE_BY_TERM.value[60]).toBe(0.45)
    expect(V4_ANNUAL_FINANCE_RATE_BY_TERM.value[36]).toBe(0.05)
    expect(V4_MONTHLY_INSURANCE.value).toBe(120_000)
    expect(V4_MONTHLY_MAINTENANCE.value).toBe(30_000)
  })

  it('baseline 분석기가 V4와 동일', () => {
    const v4 = calculateV4RentalEstimate(BASE_LR)
    const sens = runBaselineSensitivity(BASE_LR)
    expect(v4.ok && sens.ok).toBe(true)
    if (!v4.ok || !sens.ok) return
    expect(sens.metrics.monthlyRental).toBe(v4.estimate.monthlyRental)
    expect(sens.matchesDefaultV4).toBe(true)
  })

  it('overrides 적용 후 다시 기본 스냅샷으로 V4와 동일', () => {
    const snap = snapshotDefaultV4Config()
    const mutated = applySensitivityOverrides(snap, {
      monthlyInsurance: 90_000,
      residualRateByTerm: { 36: 0.53 },
    })
    expect(mutated.monthlyInsurance).toBe(90_000)
    expect(snap.monthlyInsurance).toBe(120_000)

    const after = runBaselineSensitivity(BASE_LR)
    const v4 = calculateV4RentalEstimate(BASE_LR)
    expect(after.ok && v4.ok).toBe(true)
    if (after.ok && v4.ok) {
      expect(after.metrics.monthlyRental).toBe(v4.estimate.monthlyRental)
    }
  })
})

describe('STEP6 — 개별 변수 민감도', () => {
  it('세제전·세제후 가격 기준만 변경', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return

    const rows = buildVehiclePriceBasisScenarios().map((s) =>
      runSensitivityScenario(BASE_LR, s, baseline.metrics),
    )
    expect(rows.every((r) => r.ok)).toBe(true)
    const before = rows[0]
    const after = rows[1]
    if (!before.ok || !after.ok) return
    expect(before.metrics.calculationVehiclePrice).toBe(50_600_000)
    expect(after.metrics.calculationVehiclePrice).toBe(48_100_000)
    expect(after.metrics.monthlyRental).toBeLessThan(
      before.metrics.monthlyRental,
    )
    expect(after.deltaVsBaseline!.monthlyRentalDelta).toBeLessThan(0)
  })

  it('잔가율만 변경 시 감가·금융·월액 함께 변함', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const [low, , high] = buildResidualScenarios().map((s) =>
      runSensitivityScenario(BASE_LR, s, baseline.metrics),
    )
    expect(low.ok && high.ok).toBe(true)
    if (!low.ok || !high.ok) return
    expect(high.metrics.residualValue).toBeGreaterThan(low.metrics.residualValue)
    expect(high.metrics.monthlyDepreciation).toBeLessThan(
      low.metrics.monthlyDepreciation,
    )
    expect(high.metrics.monthlyRental).toBeLessThan(low.metrics.monthlyRental)
  })

  it('금융율만 변경 시 감가상각은 동일·금융비·월액만 변함', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const [low, mid, high] = buildFinanceScenarios().map((s) =>
      runSensitivityScenario(BASE_LR, s, baseline.metrics),
    )
    expect(low.ok && mid.ok && high.ok).toBe(true)
    if (!low.ok || !mid.ok || !high.ok) return
    expect(low.metrics.monthlyDepreciation).toBeCloseTo(
      high.metrics.monthlyDepreciation,
      5,
    )
    expect(high.metrics.monthlyFinance).toBeGreaterThan(
      low.metrics.monthlyFinance,
    )
    expect(high.metrics.monthlyRental).toBeGreaterThan(
      low.metrics.monthlyRental,
    )
  })

  it('보험료만 변경 시 월액 차액 ≈ 보험 차액', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const [low, , high] = buildInsuranceScenarios().map((s) =>
      runSensitivityScenario(BASE_LR, s, baseline.metrics),
    )
    if (!low.ok || !high.ok) return
    expect(
      high.metrics.monthlyRental - low.metrics.monthlyRental,
    ).toBe(60_000)
  })

  it('정비비만 변경 시 월액 차액 ≈ 정비 차액', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const [zero, , high] = buildMaintenanceScenarios().map((s) =>
      runSensitivityScenario(BASE_LR, s, baseline.metrics),
    )
    if (!zero.ok || !high.ok) return
    expect(high.metrics.monthlyRental - zero.metrics.monthlyRental).toBe(
      50_000,
    )
  })

  it('가상 취득원가 차감만 변경(잔가 고정)', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const scenarios = buildAcquisitionDeltaScenarios()
    const rents = scenarios.map((s) => {
      const r = runSensitivityScenario(BASE_LR, s, baseline.metrics)
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.metrics.residualValue).toBe(baseline.metrics.residualValue)
        expect(r.metrics.listVehiclePrice).toBe(50_600_000)
        expect(r.metrics.priceAdjustmentMode).toBe(
          'acquisition_discount_only',
        )
      }
      return r.ok ? r.metrics.monthlyRental : 0
    })
    expect(rents[0]).toBeGreaterThan(rents[1])
    expect(rents[1]).toBeGreaterThan(rents[2])
    expect(rents[2]).toBeGreaterThan(rents[3])
    const v4 = calculateV4RentalEstimate(BASE_LR)
    if (v4.ok) expect(v4.estimate.monthlyRental).toBe(908_600)
  })
})

describe('STEP6.1 — 판매가 변경 vs 취득원가 할인 독립성', () => {
  it('기존 결합 구조: vehicle_price_change는 잔가도 함께 감소', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const vpc1m = buildVehiclePriceChangeScenarios()[1]
    const r = runSensitivityScenario(BASE_LR, vpc1m, baseline.metrics)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.metrics.listVehiclePrice).toBe(49_600_000)
    expect(r.metrics.residualValue).toBeLessThan(baseline.metrics.residualValue)
    expect(r.metrics.residualValue).toBeCloseTo(49_600_000 * 0.58, 5)
    // STEP6에서 관측한 ~15,000원 감소(잔가 동반)
    expect(r.metrics.monthlyRental).toBe(893_600)
    expect(r.deltaVsBaseline!.monthlyRentalDelta).toBe(-15_000)
  })

  it('acquisition_discount_only: 잔가=기준, 월액 감소폭이 판매가변경보다 큼', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const acq1m = buildAcquisitionDiscountOnlyScenarios()[1]
    const vpc1m = buildVehiclePriceChangeScenarios()[1]
    const a = runSensitivityScenario(BASE_LR, acq1m, baseline.metrics)
    const v = runSensitivityScenario(BASE_LR, vpc1m, baseline.metrics)
    expect(a.ok && v.ok).toBe(true)
    if (!a.ok || !v.ok) return
    expect(a.metrics.residualValue).toBe(baseline.metrics.residualValue)
    expect(a.metrics.listVehiclePrice).toBe(50_600_000)
    expect(a.metrics.acquisitionCost).toBe(49_600_000)
    expect(a.metrics.monthlyRental).toBeLessThan(v.metrics.monthlyRental)
    expect(a.metrics.prepaymentDepositBasis).toBe('list_sale_price')
  })

  it('할인 0원이면 두 모드 모두 V4와 완전 일치', () => {
    const v4 = calculateV4RentalEstimate(BASE_LR)
    expect(v4.ok).toBe(true)
    if (!v4.ok) return
    for (const s of [
      buildVehiclePriceChangeScenarios()[0],
      buildAcquisitionDiscountOnlyScenarios()[0],
    ]) {
      const r = runSensitivityScenario(BASE_LR, s)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.metrics.monthlyRental).toBe(v4.estimate.monthlyRental)
      expect(r.metrics.residualValue).toBe(v4.estimate.residualValue)
      expect(Math.abs(r.metrics.monthlyDepreciation - v4.estimate.monthlyDepreciation)).toBeLessThan(0.01)
      expect(Math.abs(r.metrics.monthlyFinance - v4.estimate.monthlyFinance)).toBeLessThan(0.01)
    }
  })

  it('두 모드가 서로 다른 잔가·월액을 산출(독립)', () => {
    const rows = compareVehiclePriceVsAcquisitionDiscount({
      trimId: 'LONG_RANGE_EARTH',
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    const d1m36 = rows.find(
      (r) => r.discountAmount === 1_000_000 && r.contractMonths === 36,
    )
    expect(d1m36).toBeDefined()
    expect(d1m36!.residualValueDelta).toBeGreaterThan(0)
    expect(d1m36!.monthlyRentalDelta).toBeLessThan(0)
    // PDF 원본 가격 장부 불변 — 분석 후 V4 동일
    const v4 = calculateV4RentalEstimate(BASE_LR)
    if (v4.ok) expect(v4.estimate.calculationVehiclePrice).toBe(50_600_000)
  })

  it('선납 기준은 판매 기준가(list) — 취득원가 할인과 분리', () => {
    const r = runSensitivityScenario(
      { ...BASE_LR, prepaymentPercent: 30 },
      buildAcquisitionDiscountOnlyScenarios()[1],
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.metrics.prepaymentAmount).toBe(50_600_000 * 0.3)
    expect(r.metrics.acquisitionCost).toBe(49_600_000)
    expect(r.metrics.financedCapital).toBe(
      49_600_000 - 50_600_000 * 0.3,
    )
  })
})

describe('STEP6 — 선납·기간·결합', () => {
  it('선납↑ 월액↓ (capital_reduction), flat_pn과 차이 존재', () => {
    for (const trimId of ['LONG_RANGE_EARTH', 'STANDARD_AIR'] as const) {
      const matrix = buildPrepaymentMatrix(trimId)
      expect(matrix.length).toBe(12)
      for (const m of CONTRACT_MONTHS) {
        const series = PREPAYMENT_PERCENTS.map(
          (p) =>
            matrix.find(
              (c) => c.contractMonths === m && c.prepaymentPercent === p,
            )!.capitalReduction.monthlyRental,
        )
        for (let i = 1; i < series.length; i++) {
          expect(series[i]).toBeLessThan(series[i - 1])
        }
      }
      const cell = matrix.find(
        (c) => c.contractMonths === 36 && c.prepaymentPercent === 30,
      )!
      expect(cell.capitalReduction.monthlyRental).not.toBe(
        cell.flatPn.monthlyRental,
      )
    }
  })

  it('고선납 기간 역전은 오류 강제 아님', () => {
    const order0 = analyzeTermOrder('LONG_RANGE_EARTH', 0)
    expect(order0.inverted).toBe(false)
    const order30 = analyzeTermOrder('LONG_RANGE_EARTH', 30)
    // 역전 가능 — 발생해도 테스트 실패로 보지 않음
    expect(order30.monthlies.every((n) => Number.isFinite(n))).toBe(true)
  })

  it('결합 시나리오 ≠ 개별 효과 단순합 가정 금지(수치만 확인)', () => {
    const baseline = runBaselineSensitivity(BASE_LR)
    expect(baseline.ok).toBe(true)
    if (!baseline.ok) return
    const combined = runSensitivityScenario(
      BASE_LR,
      {
        id: 'combined_residual_finance',
        label: '잔가↑ + 금융↓',
        factor: 'combined',
        assumptionNote: '결합 분석용',
        overrides: {
          residualRateByTerm: { 36: 0.63, 48: 0.56, 60: 0.5 },
          annualFinanceRate: 0.04,
        },
      },
      baseline.metrics,
    )
    expect(combined.ok).toBe(true)
    if (!combined.ok) return
    const residualOnly = runSensitivityScenario(
      BASE_LR,
      buildResidualScenarios()[2],
      baseline.metrics,
    )
    const financeOnly = runSensitivityScenario(
      BASE_LR,
      buildFinanceScenarios()[0],
      baseline.metrics,
    )
    if (!residualOnly.ok || !financeOnly.ok) return
    const sumDelta =
      residualOnly.deltaVsBaseline!.monthlyRentalDelta +
      financeOnly.deltaVsBaseline!.monthlyRentalDelta
    // 근사적으로 가산적일 수 있으나 동일 보장은 하지 않음 — 유한값만 확인
    expect(Number.isFinite(combined.deltaVsBaseline!.monthlyRentalDelta)).toBe(
      true,
    )
    expect(Number.isFinite(sumDelta)).toBe(true)
  })
})

describe('STEP6 — 비정상·부가세·롯데 독립', () => {
  it('NaN/Infinity/음수 월액 하한 보정 없음', () => {
    const overResidual = calculateWithConfigSnapshot(
      BASE_LR,
      applySensitivityOverrides(snapshotDefaultV4Config(), {
        residualRateByTerm: { 36: 0.95 },
      }),
      {
        // 고선납 + 고장가로 음수 감가 가능
      },
    )
    // 정상 범위라도 유한
    expect(overResidual.ok).toBe(true)

    const highPrepay = calculateWithConfigSnapshot(
      { ...BASE_LR, prepaymentPercent: 30 },
      applySensitivityOverrides(snapshotDefaultV4Config(), {
        residualRateByTerm: { 36: 0.9 },
      }),
      { prepaymentMode: 'capital_reduction' },
    )
    expect(highPrepay.ok).toBe(true)
    if (highPrepay.ok) {
      expect(Number.isFinite(highPrepay.metrics.rawMonthlyRental)).toBe(true)
      // 하한 Math.max 미적용 — 음수면 그대로 경고
      if (highPrepay.metrics.rawMonthlyRental < 0) {
        expect(
          highPrepay.metrics.warnings.some((w) =>
            w.includes('negative_'),
          ),
        ).toBe(true)
      }
    }
  })

  it('부가세 이중 가산 없음·세 분석 노트 존재', () => {
    const notes = getVatAndTaxAnalysisNotes()
    expect(notes.some((n) => n.includes('×1.1'))).toBe(true)
    const r = runBaselineSensitivity(BASE_AIR)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.configUsed.vatTreatment).toContain('no_extra_multiplier')
      // 운영비 = 보험+세+정비 (세≈1667)
      expect(r.metrics.monthlyVehicleTax).toBe(Math.round(20_000 / 12))
      expect(r.metrics.monthlyOperatingCost).toBe(
        120_000 + Math.round(20_000 / 12) + 30_000,
      )
    }
  })

  it('롯데 비교는 사후이며 V4 월액과 독립', () => {
    const before = calculateV4RentalEstimate(BASE_AIR)
    const table = buildLotteReferenceComparisonTable()
    expect(table.rows.length).toBeGreaterThan(0)
    expect(table.disclaimer).toContain('정확도')
    // 롯데 관측값 변경이 없더라도 V4 불변 확인
    const after = calculateV4RentalEstimate(BASE_AIR)
    expect(before.ok && after.ok).toBe(true)
    if (before.ok && after.ok) {
      expect(after.estimate.monthlyRental).toBe(before.estimate.monthlyRental)
    }
  })

  it('영향 요인 순위가 산출된다', () => {
    const ranks = rankFactorImpacts(BASE_LR)
    expect(ranks.length).toBeGreaterThanOrEqual(5)
    expect(ranks[0].absMonthlyImpact).toBeGreaterThanOrEqual(
      ranks[ranks.length - 1].absMonthlyImpact,
    )
  })
})
