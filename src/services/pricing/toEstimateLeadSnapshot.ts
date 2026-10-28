import { getVehiclePriceBeforeTax } from '@/data/rentalVehiclePrices'
import type { EstimateLeadSnapshot, QuoteSelection } from '@/types'
import type { RentalEstimateResult } from './rentalEstimate.types'

export function toEstimateLeadSnapshot(
  selection: QuoteSelection,
  estimate: RentalEstimateResult,
): EstimateLeadSnapshot {
  const vehiclePriceBeforeTax = getVehiclePriceBeforeTax(selection.trimId) ?? null
  const isSimulation =
    estimate.meta.estimateStatus === 'public_reference' ||
    estimate.meta.estimateStatus === 'simulation_assumption' ||
    estimate.meta.pricingMode === 'simulation'

  return {
    trimId: selection.trimId,
    vehiclePriceBeforeTax,
    prepaymentPercent: selection.prepaymentPercent,
    depositPercent: selection.depositPercent,
    prepaymentRate: selection.prepaymentPercent,
    depositRate: selection.depositPercent,
    annualMileage: selection.annualMileage,
    contractMonths: selection.contractMonths,
    estimatedMonthlyFee: estimate.ok ? estimate.roundedMonthlyRent : null,
    roundedMonthlyRent: estimate.ok ? estimate.roundedMonthlyRent : null,
    rawMonthlyRent: estimate.ok ? estimate.rawMonthlyRent : null,
    estimateStatus: estimate.meta.estimateStatus,
    referenceSource: estimate.meta.pricingSource,
    referenceVersion: estimate.meta.pricingVersion,
    estimateCalculatedAt: new Date().toISOString(),
    pricingMode: estimate.meta.pricingMode,
    pricingVersion: estimate.meta.pricingVersion,
    isSimulation,
  }
}
