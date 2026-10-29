/**
 * 롯데렌터카 온라인 예상 견적 — 비교·검증 전용.
 * V4 계산기(`services/pricing/v4`)는 이 모듈을 import하지 않습니다.
 * 목표 금액·캘리브레이션 소스로 사용 금지.
 */

export type LotteProductType = 'select_return_or_acquire' | 'acquire'

export interface LotteObservedQuote {
  provider: 'lotte_rentacar'
  observedAt: '2026-10-29'
  trimLabel: 'EV3 스탠다드 에어 2WD'
  trimId: 'STANDARD_AIR'
  vehiclePriceListed: 42_030_000
  annualMileage: 20_000
  depositPercent: 0
  prepaymentPercent: 0 | 30
  contractMonths: 36 | 48 | 60
  productType: LotteProductType
  monthlyRentObserved: number
  note: string
}

/** 비교자료 A: 인수/반납 선택형 */
const SELECT_MATRIX: Record<0 | 30, Record<36 | 48 | 60, number>> = {
  0: { 36: 640_500, 48: 588_500, 60: 549_490 },
  30: { 36: 265_723, 48: 301_992, 60: 315_834 },
}

/** 비교자료 B: 인수형 */
const ACQUIRE_MATRIX: Record<0 | 30, Record<36 | 48 | 60, number>> = {
  0: { 36: 571_690, 48: 538_000, 60: 509_890 },
  30: { 36: 196_923, 48: 251_492, 60: 276_334 },
}

function buildRows(
  productType: LotteProductType,
  matrix: Record<0 | 30, Record<36 | 48 | 60, number>>,
): LotteObservedQuote[] {
  const rows: LotteObservedQuote[] = []
  for (const prepaymentPercent of [0, 30] as const) {
    for (const contractMonths of [36, 48, 60] as const) {
      rows.push({
        provider: 'lotte_rentacar',
        observedAt: '2026-10-29',
        trimLabel: 'EV3 스탠다드 에어 2WD',
        trimId: 'STANDARD_AIR',
        vehiclePriceListed: 42_030_000,
        annualMileage: 20_000,
        depositPercent: 0,
        prepaymentPercent,
        contractMonths,
        productType,
        monthlyRentObserved: matrix[prepaymentPercent][contractMonths],
        note: '롯데렌터카 온라인 예상 견적. 최종 계약 확정가 아님. 보험·정비·상품형 세부 미전부확인.',
      })
    }
  }
  return rows
}

export const LOTTE_OBSERVED_QUOTES: LotteObservedQuote[] = [
  ...buildRows('select_return_or_acquire', SELECT_MATRIX),
  ...buildRows('acquire', ACQUIRE_MATRIX),
]

export interface LotteComparisonRow {
  trimId: string
  contractMonths: number
  prepaymentPercent: number
  depositPercent: number
  annualMileage: number
  productType: LotteProductType
  v4Monthly: number
  lotteReferenceMonthly: number
  /** V4 − 롯데 (단순 차액, 검증된 오차율 아님) */
  absoluteDifference: number
  /** (V4 − 롯데) / V4 — 참고용 차이율. 시장 정확도로 표현 금지 */
  differenceRatioVsV4: number
  caveat: string
}

/**
 * V4 결과와 롯데 관측값을 나란히 비교.
 * 조건(상품형·포함서비스)이 완전 일치하지 않을 수 있으므로
 * 정확도/오차율이 아닌 참고 차액으로만 해석합니다.
 */
export function compareV4ToLotteReference(input: {
  trimId: string
  contractMonths: 36 | 48 | 60
  prepaymentPercent: 0 | 30
  depositPercent: number
  annualMileage: number
  v4Monthly: number
  productType: LotteProductType
}): LotteComparisonRow | null {
  const hit = LOTTE_OBSERVED_QUOTES.find(
    (q) =>
      q.trimId === input.trimId &&
      q.contractMonths === input.contractMonths &&
      q.prepaymentPercent === input.prepaymentPercent &&
      q.depositPercent === input.depositPercent &&
      q.annualMileage === input.annualMileage &&
      q.productType === input.productType,
  )
  if (!hit) return null

  const absoluteDifference = input.v4Monthly - hit.monthlyRentObserved
  const differenceRatioVsV4 =
    input.v4Monthly === 0 ? NaN : absoluteDifference / input.v4Monthly

  return {
    trimId: input.trimId,
    contractMonths: input.contractMonths,
    prepaymentPercent: input.prepaymentPercent,
    depositPercent: input.depositPercent,
    annualMileage: input.annualMileage,
    productType: input.productType,
    v4Monthly: input.v4Monthly,
    lotteReferenceMonthly: hit.monthlyRentObserved,
    absoluteDifference,
    differenceRatioVsV4,
    caveat:
      '상품형·보험·정비·보조금 등 조건 완전 일치 미확인. 참고 차액이며 검증된 오차율이 아님.',
  }
}

export function formatLotteComparisonLine(row: LotteComparisonRow): string {
  return [
    `트림: EV3 스탠다드 에어`,
    `기간: ${row.contractMonths}개월`,
    `선납금: ${row.prepaymentPercent}%`,
    `보증금: ${row.depositPercent}%`,
    `주행거리: 연 ${row.annualMileage.toLocaleString('ko-KR')}km`,
    `상품형(롯데 관측): ${row.productType}`,
    `V4 자체 계산금액: ${row.v4Monthly.toLocaleString('ko-KR')}원`,
    `롯데 참고금액: ${row.lotteReferenceMonthly.toLocaleString('ko-KR')}원`,
    `차액(V4-롯데): ${row.absoluteDifference.toLocaleString('ko-KR')}원`,
    `차이율(차액/V4): ${(row.differenceRatioVsV4 * 100).toFixed(1)}% — 참고용, 정확도 아님`,
    row.caveat,
  ].join('\n')
}
