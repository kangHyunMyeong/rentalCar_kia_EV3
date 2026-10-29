import type { PricingVersion, QuoteResult, QuoteSelection } from '@/types'
import type { QuotePricingProvider } from '../QuotePricingProvider'
import { calculateV5FromQuoteSelection } from './calculator'
import { V5_ENGINE_META } from './config'

/**
 * V5 시장 참고요율 Provider.
 * createPricingProvider에서 DEV + VITE_PRICING_ENGINE=v5 일 때만 선택됩니다.
 */
export class V5PricingProvider implements QuotePricingProvider {
  readonly source = 'demo' as const

  async getPricingVersion(): Promise<PricingVersion> {
    return {
      id: V5_ENGINE_META.version,
      label: 'V5 시장 참고요율 예상 견적',
      effectiveFrom: '2026-10-29',
      source: 'demo',
    }
  }

  async calculateQuote(selection: QuoteSelection): Promise<QuoteResult> {
    const result = calculateV5FromQuoteSelection(selection)

    if (!result.ok) {
      return {
        status:
          result.code === 'UNLIMITED_MILEAGE_CONSULTATION'
            ? 'consultationRequired'
            : 'error',
        currency: 'KRW',
        monthlyRent: null,
        message: result.message,
        disclaimer: V5_ENGINE_META.disclaimer,
        pricingVersionId: V5_ENGINE_META.version,
        calculatedAt: new Date().toISOString(),
      }
    }

    return {
      status: 'demo',
      currency: 'KRW',
      monthlyRent: result.estimate.monthlyRental,
      message: 'V5 시장 참고요율 기반 예상 견적',
      disclaimer: V5_ENGINE_META.disclaimer,
      pricingVersionId: V5_ENGINE_META.version,
      calculatedAt: new Date().toISOString(),
    }
  }
}
