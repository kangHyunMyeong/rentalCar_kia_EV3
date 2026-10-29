import { describe, expect, it } from 'vitest'
import { ADMIN_LEAD_SITE_ID } from './adminLeadConfig'
import { buildAdminLeadBody } from './buildAdminLeadBody'
import type { LeadRequest } from '@/types'

const baseRequest: LeadRequest = {
  name: '홍길동',
  phone: '010-1234-5678',
  privacyConsent: true,
  marketingConsent: false,
  source: 'landing-ev3',
  quoteSelection: {
    trimId: 'STANDARD_AIR',
    prepaymentPercent: 0,
    depositPercent: 0,
    annualMileage: 20000,
    contractMonths: 60,
    exteriorColorId: 'ABP',
  },
  estimateSnapshot: {
    trimId: 'STANDARD_AIR',
    vehiclePriceBeforeTax: 42_000_000,
    prepaymentPercent: 0,
    depositPercent: 0,
    annualMileage: 20000,
    contractMonths: 60,
    estimatedMonthlyFee: 492_500,
    roundedMonthlyRent: 492_500,
    rawMonthlyRent: 492_500,
    estimateStatus: 'public_reference',
    referenceSource: 'market-v5',
    referenceVersion: 'v5',
    estimateCalculatedAt: '2026-10-29T00:00:00.000Z',
    pricingMode: 'simulation',
    pricingVersion: 'v5',
    isSimulation: true,
  },
}

describe('buildAdminLeadBody', () => {
  it('site_id·이름·전화·selections를 UTF-8 JSON용 객체로 구성한다', () => {
    const body = buildAdminLeadBody(baseRequest)

    expect(body.site_id).toBe(ADMIN_LEAD_SITE_ID)
    expect(body.name).toBe('홍길동')
    expect(body.phone).toBe('010-1234-5678')
    expect(body.payload.selections.some((s) => s.key === 'trim')).toBe(true)
    expect(body.payload.selections.some((s) => s.key === 'exterior_color')).toBe(
      true,
    )
    expect(body.payload.context.landing_slug).toBe('ev3')
    // JSON.stringify가 한글을 유지하는지 스모크
    expect(JSON.stringify(body)).toContain('홍길동')
    expect(JSON.stringify(body)).not.toContain('?????')
  })
})
