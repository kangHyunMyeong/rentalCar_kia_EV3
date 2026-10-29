import type { TrimId } from '@/types'
import type { EvSubsidyAssessment, EvSubsidyAmountField } from './evSubsidyTypes'

function unverifiedNull(note: string): EvSubsidyAmountField {
  return { amountWon: null, certainty: 'unverified', note }
}

function announced(amountWon: number, note: string): EvSubsidyAmountField {
  return { amountWon, certainty: 'confirmed_positive', note }
}

function hypo(amountWon: number, note: string): EvSubsidyAmountField {
  return { amountWon, certainty: 'hypothetical_only', note }
}

/**
 * 2026 국비 공시(무공해차 통합누리집 수집 2차 자료 기준).
 * 지방비·렌트사 패스스루는 미확인.
 * EV3 GT(고성능) ≠ GT-Line 트림.
 */
export const EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED = {
  asOf: '2026-10-28',
  primarySource: 'https://ev.or.kr/',
  secondarySources: [
    'https://ev.or.kr/nportal/buySupprt/initPsLocalCarPirceAction.do',
    'https://ev.io.kr/car/ev3-long-range',
  ],
  byRegistryModel: {
    LONG_RANGE_2WD_17: 5_550_000,
    LONG_RANGE_2WD_19: 5_550_000,
    LONG_RANGE_4WD_19: 5_390_000,
    STANDARD_2WD: 4_690_000,
    /** 고성능 EV3 GT — GT-Line과 별개 */
    EV3_GT: 2_480_000,
  },
  notes: [
    '국비는 누리집 등록 모델(휠·2WD/4WD) 기준. 에어/어스/GT-Line 등급명과 1:1 매핑 아님.',
    '지방비는 거주 지자체·잔여 물량에 따라 변동. 지역 미지정 시 자동 가정 금지.',
    '렌트·리스 사업자 취득 시 보조금 수령·고객 월액 전가 여부는 미확인.',
    '전환지원금(노후차 등)은 자격 충족 시에만 — 기본 시나리오 미포함.',
  ],
} as const

/** 트림 → 국비 매핑(기본 2WD 가정). 4WD·휠은 옵션에 따라 달라질 수 있음 */
export function mapTrimToAnnouncedNationalSubsidy(
  trimId: TrimId,
): { amountWon: number; registryKey: string; note: string } {
  if (trimId.startsWith('STANDARD_')) {
    return {
      amountWon: EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.byRegistryModel.STANDARD_2WD,
      registryKey: 'STANDARD_2WD',
      note: '스탠다드 2WD 누리집 등록 국비. 휠·옵션에 따른 재분류 가능.',
    }
  }
  // LONG_RANGE_* — 기본 2WD 17/19 동일 555만. GT-Line도 GT가 아님.
  return {
    amountWon: EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.byRegistryModel.LONG_RANGE_2WD_17,
    registryKey: 'LONG_RANGE_2WD_17',
    note: '롱레인지 2WD 국비. 4WD 선택 시 539만으로 달라질 수 있음. GT-Line≠EV3 GT.',
  }
}

export function buildEvSubsidyAssessment(trimId: TrimId): EvSubsidyAssessment {
  const mapped = mapTrimToAnnouncedNationalSubsidy(trimId)
  const warnings = [
    ...EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.notes,
    '지방비·패스스루 미확인 → 월 렌트 자동 차감 금지',
    'IP/위치로 지역 보조금 추정 금지',
  ]

  return {
    modelKey: trimId,
    label: `EV3 ${trimId}`,
    isEv3GtPerformanceModel: false,
    nationalSubsidy: announced(
      mapped.amountWon,
      `국비 공시(수집 ${EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.asOf}) ${mapped.registryKey}`,
    ),
    localSubsidy: unverifiedNull('지역 미지정 — 지방비 미가정'),
    rentalBusinessExtra: unverifiedNull('렌트·리스 사업자 추가 지원 미확인'),
    otherVerifiedSupport: unverifiedNull('기타 검증 지원 없음'),
    announcedSubsidy: announced(
      mapped.amountWon,
      '현재 announced = 국비만(지방비 제외). 합산 확정 아님.',
    ),
    eligibilityStatus: 'unknown',
    lessorReceiptStatus: 'unknown',
    verifiedPassThroughAmount: {
      amountWon: null,
      certainty: 'unverified',
      note: '고객 월액 반영액 미검증',
    },
    hypotheticalPassThroughAmount: hypo(
      mapped.amountWon,
      '분석용: 국비 전액이 취득원가에서 차감된다고 가정. 확정 혜택 아님.',
    ),
    sources: [
      EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.primarySource,
      ...EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.secondarySources,
    ],
    asOf: EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.asOf,
    warnings,
  }
}

/** EV3 GT(고성능) 보조금 — GT-Line에 적용 금지용 참조 */
export function buildEv3GtPerformanceSubsidyReference(): EvSubsidyAssessment {
  const amt = EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.byRegistryModel.EV3_GT
  return {
    modelKey: 'EV3_GT',
    label: 'EV3 GT (고성능) — GT-Line과 별개',
    isEv3GtPerformanceModel: true,
    nationalSubsidy: announced(amt, 'EV3 GT 국비. GT-Line 트림에 적용 금지.'),
    localSubsidy: unverifiedNull('지역 미지정'),
    rentalBusinessExtra: unverifiedNull('미확인'),
    otherVerifiedSupport: unverifiedNull('미확인'),
    announcedSubsidy: announced(amt, 'GT 전용'),
    eligibilityStatus: 'not_applicable',
    lessorReceiptStatus: 'unknown',
    verifiedPassThroughAmount: {
      amountWon: null,
      certainty: 'unverified',
      note: 'GT-Line 견적에 사용 금지',
    },
    hypotheticalPassThroughAmount: hypo(amt, '참조만'),
    sources: [EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.primarySource],
    asOf: EV3_2026_NATIONAL_SUBSIDY_ANNOUNCED.asOf,
    warnings: ['EV3 GT ≠ EV3 GT-Line. 보조금 혼용 금지.'],
  }
}
