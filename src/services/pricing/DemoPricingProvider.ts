import type { PricingVersion, QuoteResult, QuoteSelection } from '@/types'
import type { QuotePricingProvider } from './QuotePricingProvider'

/**
 * 개발·시연 전용. 금액을 표시할 경우 반드시 demo 상태와 고지를 함께 노출합니다.
 */
export class DemoPricingProvider implements QuotePricingProvider {
  readonly source = 'demo' as const

  async getPricingVersion(): Promise<PricingVersion> {
    return {
      id: 'demo-v0',
      label: '시연용 가격표',
      effectiveFrom: '2026-01-01',
      source: 'demo',
    }
  }

  async calculateQuote(selection: QuoteSelection): Promise<QuoteResult> {
    const base = 480_000
    const trimFactor = selection.trimId.includes('GT_LINE')
      ? 1.12
      : selection.trimId.includes('AIR')
        ? 0.92
        : 1
    const batteryFactor = selection.trimId.startsWith('LONG_RANGE') ? 1.08 : 1
    const termFactor =
      selection.contractMonths === 36 ? 1.08 : selection.contractMonths === 48 ? 1.03 : 1
    const prepayFactor = 1 - selection.prepaymentPercent * 0.004
    const depositFactor = 1 - selection.depositPercent * 0.002
    const mileageFactor =
      selection.annualMileage === 'unlimited'
        ? 1.15
        : 1 + (selection.annualMileage - 20000) / 200000

    const monthly =
      Math.round(
        (base *
          trimFactor *
          batteryFactor *
          termFactor *
          prepayFactor *
          depositFactor *
          mileageFactor) /
          1000,
      ) * 1000

    return {
      status: 'demo',
      currency: 'KRW',
      monthlyRent: monthly,
      message: '시연용 금액',
      disclaimer: '시연용 금액, 실제 견적 아님',
      pricingVersionId: 'demo-v0',
      calculatedAt: new Date().toISOString(),
    }
  }
}
