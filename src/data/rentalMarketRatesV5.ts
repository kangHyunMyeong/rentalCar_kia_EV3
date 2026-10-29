import type { ContractMonths, TrimId } from '@/types'

/**
 * V5 시장 참고요율 장부 (원).
 *
 * 기준 조건:
 * - 연간 주행거리 20,000km
 * - 선납금 0% / 보증금 0%
 * - 기본 옵션 · 기본 외장색 · 2WD
 * - 계약기간별 요율 직접 조회 (EV5 기간 배수 미사용)
 *
 * 공개 시장 견적 자료를 참고해 산출한 기준값입니다.
 * 최종 제휴 확정 견적·보험·보조금·정비 조건 완전 일치가 검증되지 않았습니다.
 * verified / guaranteed 요율로 표시하지 않습니다.
 */
export const V5_MARKET_RATE_META = {
  engineId: 'market-reference-v5',
  version: '2026-10-29-v5-market-search',
  sourceName: 'public_market_reference_composite',
  sourceDetail:
    'Market-search composite baseline for EV3 2WD long-term rental (not a single verified partner tariff)',
  sourceUrls: [
    'https://www.autosign.kr/장기렌트/EV3',
    'https://swaper.kr/longterm/ev3',
  ] as const,
  /** 장부 반영일 (STEP 9) */
  asOf: '2026-10-29',
  verificationStatus: 'public_reference' as const,
  baseline: {
    annualMileage: 20_000 as const,
    prepaymentPercent: 0 as const,
    depositPercent: 0 as const,
    drivetrain: '2WD' as const,
    options: 'base' as const,
    exteriorColor: 'base' as const,
  },
  disclaimer:
    '공개 시장 견적을 참고한 예상 기준 월 렌트료입니다. 확정 계약가·보험·보조금·정비 조건이 동일하다고 보장하지 않으며, 상담 시 달라질 수 있습니다.',
  notes: [
    '개별 URL에서 조건·금액을 재확인할 수 없는 경우 확정 사실로 표시하지 않음',
    'Getcha 단일 출처 장부에서 시장 검색 복합 기준으로 교체(STEP 9)',
  ],
}

/** trimId → contractMonths → 기준 월 렌트료(원) — STEP 9 시장 참고요율 */
export const V5_MARKET_BASE_RATES: Record<
  TrimId,
  Record<ContractMonths, number>
> = {
  STANDARD_AIR: {
    36: 514_100,
    48: 510_000,
    60: 492_500,
  },
  STANDARD_EARTH: {
    36: 580_700,
    48: 569_600,
    60: 547_600,
  },
  STANDARD_GT_LINE: {
    36: 591_200,
    48: 579_400,
    60: 559_500,
  },
  LONG_RANGE_AIR: {
    36: 566_400,
    48: 560_200,
    60: 538_800,
  },
  LONG_RANGE_EARTH: {
    36: 633_200,
    48: 620_400,
    60: 593_900,
  },
  LONG_RANGE_GT_LINE: {
    36: 646_000,
    48: 631_800,
    60: 605_900,
  },
}

export function getV5MarketBaseRate(
  trimId: TrimId,
  contractMonths: ContractMonths,
): number | undefined {
  const byTrim = V5_MARKET_BASE_RATES[trimId]
  if (!byTrim) return undefined
  const rate = byTrim[contractMonths]
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0
    ? rate
    : undefined
}

export function listV5BaselineRateEntries(): Array<{
  trimId: TrimId
  contractMonths: ContractMonths
  monthlyRate: number
}> {
  const out: Array<{
    trimId: TrimId
    contractMonths: ContractMonths
    monthlyRate: number
  }> = []
  for (const trimId of Object.keys(V5_MARKET_BASE_RATES) as TrimId[]) {
    for (const contractMonths of [36, 48, 60] as const) {
      out.push({
        trimId,
        contractMonths,
        monthlyRate: V5_MARKET_BASE_RATES[trimId][contractMonths],
      })
    }
  }
  return out
}
