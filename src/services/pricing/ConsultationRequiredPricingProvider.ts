import type { PricingVersion, QuoteResult, QuoteSelection } from '@/types'
import type { QuotePricingProvider } from './QuotePricingProvider'

/**
 * 실제 요율표가 없을 때의 기본 Provider.
 * 월 렌트료를 임의 산출하지 않습니다.
 */
export class ConsultationRequiredPricingProvider implements QuotePricingProvider {
  readonly source = 'none' as const

  async getPricingVersion(): Promise<PricingVersion | null> {
    return null
  }

  async calculateQuote(_selection: QuoteSelection): Promise<QuoteResult> {
    return {
      status: 'consultationRequired',
      currency: 'KRW',
      monthlyRent: null,
      message: '상담 후 정확한 금액 안내',
      disclaimer:
        '실제 EV3 렌트 요율표가 연결되지 않았습니다. 선택하신 조건으로 상담 시 정확한 월 렌트료를 안내드립니다.',
      pricingVersionId: null,
      calculatedAt: new Date().toISOString(),
    }
  }
}
