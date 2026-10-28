import type { ContractMonths, TrimId } from '@/types'

/**
 * 겟차 공개 참고 장기렌트 월 요율 (원).
 * 공통 조건: 선납 0% / 보증 0% / 연 20,000km
 * 확정 제휴 견적이 아니며 public_reference로만 사용합니다.
 */
export const RENTAL_REFERENCE_META = {
  sourceName: 'Getcha',
  sourceUrl: 'https://www.getcha.kr',
  sourceDate: '2026-10-14',
  status: 'public_reference' as const,
  version: '2026-10-14-reference-v1',
  baselineAnnualMileage: 20_000 as const,
  baselinePrepaymentPercent: 0 as const,
  baselineDepositPercent: 0 as const,
}

/** trimId → contractMonths → monthlyRate */
export const RENTAL_REFERENCE_RATES: Record<TrimId, Record<ContractMonths, number>> = {
  STANDARD_AIR: {
    36: 440_400,
    48: 453_200,
    60: 464_713,
  },
  STANDARD_EARTH: {
    36: 500_100,
    48: 508_600,
    60: 517_266,
  },
  STANDARD_GT_LINE: {
    36: 512_700,
    48: 520_200,
    60: 528_657,
  },
  LONG_RANGE_AIR: {
    36: 465_400,
    48: 482_300,
    60: 496_290,
  },
  LONG_RANGE_EARTH: {
    36: 524_500,
    48: 536_900,
    60: 548_957,
  },
  LONG_RANGE_GT_LINE: {
    36: 538_100,
    48: 549_600,
    60: 560_368,
  },
}

export function getReferenceMonthlyRate(
  trimId: TrimId,
  contractMonths: ContractMonths,
): number | undefined {
  const byTrim = RENTAL_REFERENCE_RATES[trimId]
  if (!byTrim) return undefined
  const rate = byTrim[contractMonths]
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : undefined
}
