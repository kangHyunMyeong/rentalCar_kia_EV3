import type { PricingVersion, QuoteResult, QuoteSelection } from '@/types'
import { calculateRentalEstimate } from './calculateRentalEstimate'
import type { QuotePricingProvider } from './QuotePricingProvider'

/**
 * 공개 참고 요율 기반 시뮬레이션 Provider.
 * verified_partner_quote로 취급하지 않습니다.
 */
export class SimulationPricingProvider implements QuotePricingProvider {
  readonly source = 'demo' as const

  async getPricingVersion(): Promise<PricingVersion> {
    return {
      id: '2026-10-14-reference-v1',
      label: '공개 참고 견적 시뮬레이션',
      effectiveFrom: '2026-10-14',
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
      monthlyRent: result.roundedMonthlyRent,
      message: '공개 참고 견적 기반 시뮬레이션',
      disclaimer:
        '공개 참고 견적을 기준으로 산출한 시뮬레이션 금액입니다. 실제 계약 금액은 렌트사, 보험 및 계약 조건에 따라 달라질 수 있습니다.',
      pricingVersionId: result.meta.pricingVersion,
      calculatedAt: new Date().toISOString(),
    }
  }
}
