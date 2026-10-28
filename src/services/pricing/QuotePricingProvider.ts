import type { PricingVersion, QuoteResult, QuoteSelection } from '@/types'

/**
 * 렌트 요율 API 연결 시 구현체를 교체하기 위한 인터페이스.
 * UI는 이 계약만 의존하며, 차량 판매가로 임의 월렌트를 계산하지 않습니다.
 */
export interface QuotePricingProvider {
  readonly source: PricingVersion['source']
  getPricingVersion(): Promise<PricingVersion | null>
  calculateQuote(selection: QuoteSelection): Promise<QuoteResult>
}
