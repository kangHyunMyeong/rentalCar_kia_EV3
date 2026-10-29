import type { ContractMonths, TrimId } from '@/types'
import {
  calculateWithConfigSnapshot,
  runSensitivityScenario,
  snapshotDefaultV4Config,
} from './sensitivityCalculator'
import type { SensitivityEstimateMetrics } from './sensitivityTypes'
import type { VehicleCostScenarioDef } from './vehicleCostScenarios'
import { buildCoreRealityScenarios } from './vehicleCostScenarios'

export interface SeparatedCostBases {
  referenceSalePrice: number
  acquisitionCost: number
  residualBasePrice: number
  residualValue: number
  residualRate: number
  prepaymentBasis: 'list_sale_price'
  verifiedIncentive: number
  hypotheticalAcquisitionReduction: number
}

export function runVehicleCostScenario(args: {
  trimId: TrimId
  contractMonths: ContractMonths
  scenario: VehicleCostScenarioDef
  annualMileage?: 10_000 | 15_000 | 20_000 | 30_000
  prepaymentPercent?: 0 | 10 | 20 | 30
  depositPercent?: 0 | 10 | 20 | 30
}): {
  ok: true
  metrics: SensitivityEstimateMetrics
  bases: SeparatedCostBases
  scenario: VehicleCostScenarioDef
} | {
  ok: false
  message: string
  scenario: VehicleCostScenarioDef
} {
  const {
    trimId,
    contractMonths,
    scenario,
    annualMileage = 20_000,
    prepaymentPercent = 0,
    depositPercent = 0,
  } = args

  const result = runSensitivityScenario(
    {
      trimId,
      contractMonths,
      annualMileage,
      prepaymentPercent,
      depositPercent,
      vehiclePriceBasis: scenario.vehiclePriceBasis,
    },
    {
      id: scenario.id,
      label: scenario.label,
      factor:
        scenario.hypotheticalAcquisitionReduction === 0
          ? 'vehicle_price_basis'
          : 'acquisition_cost_delta',
      assumptionNote: scenario.assumptions.join(' | '),
      overrides: {
        vehiclePriceBasis: scenario.vehiclePriceBasis,
        calculationVehiclePriceAdjustment:
          scenario.hypotheticalAcquisitionReduction,
        priceAdjustmentMode: scenario.priceAdjustmentMode,
      },
    },
  )

  if (!result.ok) {
    return { ok: false, message: result.message, scenario }
  }

  const m = result.metrics
  return {
    ok: true,
    metrics: m,
    scenario,
    bases: {
      referenceSalePrice: m.listVehiclePrice,
      acquisitionCost: m.acquisitionCost,
      residualBasePrice: m.residualPriceBasisAmount,
      residualValue: m.residualValue,
      residualRate: m.residualRate,
      prepaymentBasis: 'list_sale_price',
      verifiedIncentive: scenario.verifiedIncentive,
      hypotheticalAcquisitionReduction:
        scenario.hypotheticalAcquisitionReduction,
    },
  }
}

export function runAllRealityScenariosForTrim(
  trimId: TrimId,
  contractMonths: ContractMonths,
) {
  return buildCoreRealityScenarios(trimId).map((scenario) =>
    runVehicleCostScenario({ trimId, contractMonths, scenario }),
  )
}

/** 잔가 고정 여부 검증용 */
export function assertResidualFixedWhenAcquisitionOnly(
  trimId: TrimId,
  contractMonths: ContractMonths,
  reduction: number,
): boolean {
  const base = calculateWithConfigSnapshot(
    {
      trimId,
      contractMonths,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      vehiclePriceBasis: 'afterTaxBenefit',
    },
    snapshotDefaultV4Config(),
    {
      vehiclePriceBasis: 'afterTaxBenefit',
      priceAdjustmentMode: 'acquisition_discount_only',
      calculationVehiclePriceAdjustment: 0,
    },
  )
  const reduced = calculateWithConfigSnapshot(
    {
      trimId,
      contractMonths,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
      vehiclePriceBasis: 'afterTaxBenefit',
    },
    snapshotDefaultV4Config(),
    {
      vehiclePriceBasis: 'afterTaxBenefit',
      priceAdjustmentMode: 'acquisition_discount_only',
      calculationVehiclePriceAdjustment: reduction,
    },
  )
  if (!base.ok || !reduced.ok) return false
  return (
    base.metrics.residualValue === reduced.metrics.residualValue &&
    base.metrics.listVehiclePrice === reduced.metrics.listVehiclePrice &&
    reduced.metrics.acquisitionCost ===
      base.metrics.acquisitionCost + reduction
  )
}
