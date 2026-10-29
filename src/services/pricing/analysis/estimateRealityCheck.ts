import { RENTAL_VEHICLE_PRICE_BOOK } from '@/data/rentalVehiclePriceBook'
import type { ContractMonths, TrimId } from '@/types'
import { calculateRentalEstimate } from '../calculateRentalEstimate'
import { calculateV4RentalEstimate } from '../v4/calculator'
import { simulateRentalEstimate } from '../simulation/simulateRentalEstimate'
import {
  runAllRealityScenariosForTrim,
  runVehicleCostScenario,
} from './acquisitionCostAnalysis'
import {
  buildEv3GtPerformanceSubsidyReference,
  buildEvSubsidyAssessment,
} from './evSubsidyScenarios'
import {
  EXPECTED_OFFICIAL_TRIM_PRICES,
  KIA_OFFICIAL_PRICE_PAGE,
  buildCoreRealityScenarios,
} from './vehicleCostScenarios'

export const STEP72_CUSTOMER_COPY_PROPOSAL = {
  title: '예상 월 렌트료',
  disclaimer:
    '선택하신 차량 및 계약 조건을 기준으로 계산한 예상 월 렌트료입니다. 실제 견적은 차량 옵션, 보조금, 보험 및 계약 조건 등에 따라 달라질 수 있습니다.',
  cta: '무료 맞춤 견적 상담받기',
  note: 'STEP 7.2 제안 문구 — 랜딩 UI 미적용',
} as const

/** STEP 7.2 프롬프트 참고값 — 코드 결과와 대조용(역산 보정 금지) */
export const STEP72_REFERENCE_MONTHLIES = {
  LONG_RANGE_EARTH: {
    A: { 36: 908_600, 48: 827_400, 60: 768_400 },
    B: { 36: 871_200, 48: 794_000, 60: 737_900 },
    C_5m: { 36: 721_900, 48: 679_400, 60: 644_100 },
    D_7m: { 36: 662_100, 48: 633_600, 60: 606_600 },
  },
  STANDARD_AIR: {
    A: { 36: 780_400, 48: 712_900, 60: 663_900 },
    B: { 36: 749_300, 48: 685_200, 60: 638_600 },
    acq_4m: { 36: 629_800, 48: 593_500, 60: 563_600 },
    acq_6m: { 36: 570_100, 48: 547_700, 60: 526_100 },
  },
} as const

export function verifyOfficialPriceBookAgainstExpected(): {
  allMatch: boolean
  rows: Array<{
    trimId: TrimId
    bookBefore: number
    bookAfter: number
    expectedBefore: number
    expectedAfter: number
    match: boolean
  }>
  kiaOfficialUrl: string
  note: string
} {
  const rows = (Object.keys(EXPECTED_OFFICIAL_TRIM_PRICES) as TrimId[]).map(
    (trimId) => {
      const book = RENTAL_VEHICLE_PRICE_BOOK[trimId]
      const expected = EXPECTED_OFFICIAL_TRIM_PRICES[trimId]
      const match =
        book.vehiclePriceBeforeTaxBenefit === expected.before &&
        book.vehiclePriceAfterTaxBenefit === expected.after
      return {
        trimId,
        bookBefore: book.vehiclePriceBeforeTaxBenefit,
        bookAfter: book.vehiclePriceAfterTaxBenefit,
        expectedBefore: expected.before,
        expectedAfter: expected.after,
        match,
      }
    },
  )
  return {
    allMatch: rows.every((r) => r.match),
    rows,
    kiaOfficialUrl: KIA_OFFICIAL_PRICE_PAGE,
    note: '2026-10-29 kia.com/kr/vehicles/ev3/price/ 조회: PDF·장부·공식 사이트 금액 일치. 장부 임의 변경 없음.',
  }
}

export function analyzeWhyV4MayReadHigh(): string[] {
  return [
    '판매 기준을 세제전 소비자가로 두고 취득원가 할인을 반영하지 않음 → 자본·잔가 기준이 시장 취득가보다 높을 수 있음.',
    '전기차 국비·지방비 보조금의 렌트사 패스스루가 미확인·미반영.',
    '월 보험 12만+정비 3만=약 15.2만 운영비가 상품 패키지에 따라 과다할 수 있음(미검증).',
    '잔가율 58/51/45%는 내부 가정 — 잔가가 낮으면 감가가 커져 월액↑.',
    '연 금융 5% 근사는 Money Factor·실행금리와 다를 수 있음.',
    'V2(겟차 참고)와 구조가 달라 금액 차이 자체가 오류를 의미하지 않음.',
  ]
}

export function buildScenarioMonthlyTable(
  trimId: TrimId,
): Array<{
  scenarioId: string
  label: string
  monthlies: Record<ContractMonths, number | null>
  residual36: number | null
  listPrice: number | null
  acquisition36: number | null
}> {
  const scenarios = buildCoreRealityScenarios(trimId)
  return scenarios.map((scenario) => {
    const monthlies = { 36: null, 48: null, 60: null } as Record<
      ContractMonths,
      number | null
    >
    let residual36: number | null = null
    let listPrice: number | null = null
    let acquisition36: number | null = null
    for (const m of [36, 48, 60] as const) {
      const r = runVehicleCostScenario({
        trimId,
        contractMonths: m,
        scenario,
      })
      if (r.ok) {
        monthlies[m] = r.metrics.monthlyRental
        if (m === 36) {
          residual36 = r.metrics.residualValue
          listPrice = r.bases.referenceSalePrice
          acquisition36 = r.bases.acquisitionCost
        }
      }
    }
    return {
      scenarioId: scenario.id,
      label: scenario.label,
      monthlies,
      residual36,
      listPrice,
      acquisition36,
    }
  })
}

export function compareEnginesLongRangeEarthZeroPrepay(): Array<{
  months: ContractMonths
  v2: number | null
  v3: number | null
  v4: number | null
}> {
  return ([36, 48, 60] as const).map((months) => {
    const v2 = calculateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: months,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    const v3 = simulateRentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: months,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    const v4 = calculateV4RentalEstimate({
      trimId: 'LONG_RANGE_EARTH',
      contractMonths: months,
      annualMileage: 20_000,
      prepaymentPercent: 0,
      depositPercent: 0,
    })
    return {
      months,
      v2: v2.ok ? v2.monthlyEstimate : null,
      v3: v3.ok ? v3.monthlyEstimate : null,
      v4: v4.ok ? v4.estimate.monthlyRental : null,
    }
  })
}

export type OpsRecommendationId = 'A_keep_v4' | 'B_after_tax' | 'C_verified_acq'

export interface OpsRecommendation {
  id: OpsRecommendationId
  title: string
  suitability: 'not_recommended_alone' | 'recommended_base' | 'conditional'
  reasons: string[]
  risks: string[]
  neededData: string[]
}

export function getOpsRecommendations(): {
  options: OpsRecommendation[]
  expertPick: OpsRecommendationId
  expertNote: string
  applyOnlyAfterApproval: true
} {
  const options: OpsRecommendation[] = [
    {
      id: 'A_keep_v4',
      title: 'A안. 현재 V4 유지(세제전·보조금 미반영)',
      suitability: 'not_recommended_alone',
      reasons: [
        '공식 판매가 기준으로 보수적·재현 가능',
        '과소 추정 위험은 낮음',
      ],
      risks: [
        '고객 체감·공개 참고 견적 대비 월액이 높게 보일 수 있음',
        '상담 전환 전에 “비싸다” 인식 위험',
      ],
      neededData: [],
    },
    {
      id: 'B_after_tax',
      title: 'B안. 세제후 판매가 기준(보조금 미확인 유지)',
      suitability: 'recommended_base',
      reasons: [
        '공식 확인된 세제후 가격만 반영 — 임의 할인 없음',
        '현재 V4 대비 월액이 합리적으로 소폭 하락(LR 어스 36개월 약 −3.7만)',
        '보조금·취득할인을 확정으로 오인하지 않음',
      ],
      risks: [
        '세제후가도 취득원가는 아님',
        '공개 참고 견적과는 여전히 차이 가능(보험·잔가·상품형)',
      ],
      neededData: ['렌트사 판매가 기준(세제전/후) 확인'],
    },
    {
      id: 'C_verified_acq',
      title: 'C안. 세제후 + 검증된 취득원가 혜택만',
      suitability: 'conditional',
      reasons: [
        '시장 현실에 가장 가깝게 맞출 여지',
        '가상 500~700만·국비 전액 시나리오는 분석용으로만 유지',
      ],
      risks: [
        '미검증 보조금 전액 반영 시 과소 추정',
        '지역·물량·법인/렌트 자격에 따라 편차 큼',
      ],
      neededData: [
        '렌트사 취득원가 또는 확인된 패스스루 금액',
        '국비·지방비 실제 수령 여부',
        '동일조건 파트너 견적',
      ],
    },
  ]

  return {
    options,
    expertPick: 'B_after_tax',
    expertNote:
      '승인 전 운영 교체 금지. 단기적으로는 B안(세제후 기준)을 기본 표시 후보로 두고, 보조금·취득할인은 검증 후에만 C안으로 확대하는 것이 과대·과소 위험을 균형 있게 관리합니다. 가상 시나리오 C/D/E 금액을 확정 견적으로 쓰지 마세요.',
    applyOnlyAfterApproval: true,
  }
}

export function collectSubsidyReport(trimId: TrimId) {
  return {
    trim: buildEvSubsidyAssessment(trimId),
    gtPerformanceReference: buildEv3GtPerformanceSubsidyReference(),
  }
}

export function runFullTrimScenarioMatrix() {
  const trims = Object.keys(RENTAL_VEHICLE_PRICE_BOOK) as TrimId[]
  return trims.map((trimId) => ({
    trimId,
    table: buildScenarioMonthlyTable(trimId),
    sample36: runAllRealityScenariosForTrim(trimId, 36),
  }))
}
