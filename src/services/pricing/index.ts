import { ConsultationRequiredPricingProvider } from './ConsultationRequiredPricingProvider'
import type { QuotePricingProvider } from './QuotePricingProvider'

/**
 * 요율 API 연동 시 이 팩토리만 교체하면 됩니다.
 *
 * - simulation / 미설정 / demo: SimulationPricingProvider (참고용 가정값)
 * - api / verified: 검증된 요율만 사용. 미연결 시 simulation 가정값을 절대 쓰지 않음
 */
export async function createPricingProvider(): Promise<QuotePricingProvider> {
  const mode = import.meta.env.VITE_PRICING_MODE

  if (mode === 'api' || mode === 'verified') {
    // 향후 ApiPricingProvider로 교체. 미검증 금액을 verified로 공개하지 않음.
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
  resolveResidualValueRate,
} from './calculateRentalEstimate'
export { toEstimateLeadSnapshot } from './toEstimateLeadSnapshot'
export type { PricingMeta, PricingMode, RentalEstimateResult } from './rentalEstimate.types'
