import { getVehiclePriceBeforeTax } from '@/data/rentalVehiclePrices'
import type { EstimateLeadSnapshot, QuoteSelection } from '@/types'
import type { RentalEstimateResult } from './rentalEstimate.types'

export function toEstimateLeadSnapshot(
  selection: QuoteSelection,
  estimate: RentalEstimateResult,
): EstimateLeadSnapshot {
  const vehiclePriceBeforeTax = getVehiclePriceBeforeTax(selection.trimId) ?? null
  const isSimulation = estimate.meta.pricingMode === 'simulation'

  return {
    trimId: selection.trimId,
    vehiclePriceBeforeTax,
    prepaymentPercent: selection.prepaymentPercent,
    depositPercent: selection.depositPercent,
    annualMileage: selection.annualMileage,
    contractMonths: selection.contractMonths,
    estimatedMonthlyFee: estimate.ok ? estimate.monthlyEstimate : null,
    pricingMode: estimate.meta.pricingMode,
    pricingVersion: estimate.meta.pricingVersion,
    isSimulation,
  }
}
