import type { PricingVersion, QuoteResult, QuoteSelection } from '@/types'
import { calculateRentalEstimate } from './calculateRentalEstimate'
import type { QuotePricingProvider } from './QuotePricingProvider'

/**
 * 개발용 시뮬레이션 Provider.
 * 가정값 기반 참고 금액을 반환하며, 실제 계약 요율로 취급하면 안 됩니다.
 */
export class SimulationPricingProvider implements QuotePricingProvider {
  readonly source = 'demo' as const

  async getPricingVersion(): Promise<PricingVersion> {
    return {
      id: 'sim-dev-2026-03',
      label: '개발용 시뮬레이션',
      effectiveFrom: '2026-03-01',
      source: 'demo',
    }
  }

  async calculateQuote(selection: QuoteSelection): Promise<QuoteResult> {
    const result = calculateRentalEstimate(selection)

    if (!result.ok) {
      return {
        status: 'error',
        currency: 'KRW',
        monthlyRent: null,
        message: result.message,
        disclaimer:
          '필요한 견적 데이터가 없어 금액을 표시할 수 없습니다. 상담으로 문의해 주세요.',
        pricingVersionId: result.meta.pricingVersion,
        calculatedAt: new Date().toISOString(),
      }
    }

    return {
      status: 'demo',
      currency: 'KRW',
      monthlyRent: result.monthlyEstimate,
      message: '참고용 시뮬레이션 금액',
      disclaimer:
        '참고용 시뮬레이션 금액입니다. 실제 렌트사 요율과 다를 수 있으며, 정확한 금액은 상담 후 확인해야 합니다.',
      pricingVersionId: result.meta.pricingVersion,
      calculatedAt: new Date().toISOString(),
    }
  }
}
