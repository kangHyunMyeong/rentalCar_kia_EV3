import { describe, expect, it } from 'vitest'
import { ConsultationRequiredPricingProvider } from './ConsultationRequiredPricingProvider'
import { DemoPricingProvider } from './DemoPricingProvider'
import { SimulationPricingProvider } from './SimulationPricingProvider'
import type { QuoteSelection } from '@/types'

const zeroPrepEarth60: QuoteSelection = {
  trimId: 'LONG_RANGE_EARTH',
  prepaymentPercent: 0,
  depositPercent: 0,
  annualMileage: 20_000,
  contractMonths: 60,
}

describe('QuotePricingProvider', () => {
  it('verified(미연결) Provider는 월 렌트료를 산출하지 않는다', async () => {
    const provider = new ConsultationRequiredPricingProvider()
    const result = await provider.calculateQuote(zeroPrepEarth60)

    expect(result.status).toBe('consultationRequired')
    expect(result.monthlyRent).toBeNull()
  })

  it('시연 Provider는 demo 고지와 함께 금액을 반환한다', async () => {
    const provider = new DemoPricingProvider()
    const result = await provider.calculateQuote(zeroPrepEarth60)

    expect(result.status).toBe('demo')
    expect(result.monthlyRent).toBeTypeOf('number')
    expect(result.disclaimer).toContain('시연용 금액, 실제 견적 아님')
  })

  it('시뮬레이션 Provider는 공개 참고 기준 549,000원을 반환한다', async () => {
    const provider = new SimulationPricingProvider()
    const result = await provider.calculateQuote(zeroPrepEarth60)

    expect(result.status).toBe('demo')
    expect(result.monthlyRent).toBe(549_000)
    expect(result.disclaimer).toContain('공개 참고 견적')
  })
})
