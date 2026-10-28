import { ConsultationRequiredPricingProvider } from './ConsultationRequiredPricingProvider'
import type { QuotePricingProvider } from './QuotePricingProvider'

/**
 * 요율 API 연동 시 이 팩토리만 교체하면 됩니다.
 *
 * - simulation / 미설정 / demo: SimulationPricingProvider (공개 참고 + 가정 조정)
 * - api / verified: 검증된 요율만 사용. 미연결 시 public_reference를 verified로 쓰지 않음
 */
export async function createPricingProvider(): Promise<QuotePricingProvider> {
  const mode = import.meta.env.VITE_PRICING_MODE

  if (mode === 'api' || mode === 'verified') {
    return new ConsultationRequiredPricingProvider()
  }

  const { SimulationPricingProvider } = await import('./SimulationPricingProvider')
  return new SimulationPricingProvider()
}

export type { QuotePricingProvider } from './QuotePricingProvider'
export {
  calculateRentalEstimate,
  getActivePricingMode,
  resolveRentalEstimate,
  roundMonthlyRent,
} from './calculateRentalEstimate'
export { toEstimateLeadSnapshot } from './toEstimateLeadSnapshot'
export type {
  EstimateStatus,
  PricingMeta,
  PricingMode,
  RentalEstimateResult,
} from './rentalEstimate.types'
