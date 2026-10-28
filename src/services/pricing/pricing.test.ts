import { describe, expect, it } from 'vitest'
import { DEFAULT_QUOTE_SELECTION } from '@/data/rental-conditions'
import { ConsultationRequiredPricingProvider } from './ConsultationRequiredPricingProvider'
import { DemoPricingProvider } from './DemoPricingProvider'
import { SimulationPricingProvider } from './SimulationPricingProvider'

describe('QuotePricingProvider', () => {
  it('verified(미연결) Provider는 월 렌트료를 산출하지 않는다', async () => {
    const provider = new ConsultationRequiredPricingProvider()
    const result = await provider.calculateQuote(DEFAULT_QUOTE_SELECTION)

    expect(result.status).toBe('consultationRequired')
    expect(result.monthlyRent).toBeNull()
    expect(result.message).toContain('상담 후 정확한 금액 안내')
  })

  it('시연 Provider는 demo 고지와 함께 금액을 반환한다', async () => {
    const provider = new DemoPricingProvider()
    const result = await provider.calculateQuote(DEFAULT_QUOTE_SELECTION)

    expect(result.status).toBe('demo')
    expect(result.monthlyRent).toBeTypeOf('number')
    expect(result.disclaimer).toContain('시연용 금액, 실제 견적 아님')
  })

  it('시뮬레이션 Provider는 기본 조건에서 702,000원을 반환한다', async () => {
    const provider = new SimulationPricingProvider()
    const result = await provider.calculateQuote(DEFAULT_QUOTE_SELECTION)

    expect(result.status).toBe('demo')
    expect(result.monthlyRent).toBe(702_000)
    expect(result.message).toContain('참고용 시뮬레이션')
    expect(result.disclaimer).toContain('실제 렌트사 요율과 다를 수 있으며')
  })
})
