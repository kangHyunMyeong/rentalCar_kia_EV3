import type { VehiclePriceBasis } from '@/data/rentalVehiclePriceBook'
import type { TrimId } from '@/types'
import { mapTrimToAnnouncedNationalSubsidy } from './evSubsidyScenarios'
import type { PriceAdjustmentMode } from './sensitivityTypes'

export type RealityScenarioId =
  | 'A_current_v4'
  | 'B_after_tax'
  | 'C_after_tax_acq_5m'
  | 'D_after_tax_acq_7m'
  | 'E_after_tax_hypo_national_subsidy'
  | 'AIR_after_tax_acq_4m'
  | 'AIR_after_tax_acq_6m'

export interface VehicleCostScenarioDef {
  id: RealityScenarioId
  label: string
  vehiclePriceBasis: VehiclePriceBasis
  /** acquisition_discount_only 차감액(음수). 0이면 차감 없음 */
  hypotheticalAcquisitionReduction: number
  priceAdjustmentMode: PriceAdjustmentMode
  /** 확정 인센티브 — 현재 전부 0(미검증) */
  verifiedIncentive: number
  assumptions: string[]
  /** 공식 확인 / 내부 가정 / 미확인 */
  evidenceNotes: {
    official: string[]
    internalAssumption: string[]
    unverified: string[]
  }
}

const INTERNAL_ASSUMPTIONS = [
  '잔가율 36/48/60 = 58/51/45%',
  '연 금융율 5%',
  '월 보험 120,000 / 정비 30,000 / 자동차세 ≈1,667',
  '보증금 할인 연 2%',
  '검증 프로모션 0',
]

export function buildCoreRealityScenarios(
  trimId: TrimId,
): VehicleCostScenarioDef[] {
  const national = mapTrimToAnnouncedNationalSubsidy(trimId)

  const base: VehicleCostScenarioDef[] = [
    {
      id: 'A_current_v4',
      label: 'A. 현재 V4 (세제전·취득차감 없음)',
      vehiclePriceBasis: 'beforeTaxBenefit',
      hypotheticalAcquisitionReduction: 0,
      priceAdjustmentMode: 'acquisition_discount_only',
      verifiedIncentive: 0,
      assumptions: [
        '세제혜택 전 판매가 = 계산·잔가·선납 기준',
        '취득원가 추가 차감 없음',
        ...INTERNAL_ASSUMPTIONS,
      ],
      evidenceNotes: {
        official: ['기아 PDF/공식 사이트 세제전 판매가'],
        internalAssumption: INTERNAL_ASSUMPTIONS,
        unverified: ['렌트사 취득원가', '보조금 패스스루'],
      },
    },
    {
      id: 'B_after_tax',
      label: 'B. 세제후 판매가 (취득차감 없음)',
      vehiclePriceBasis: 'afterTaxBenefit',
      hypotheticalAcquisitionReduction: 0,
      priceAdjustmentMode: 'acquisition_discount_only',
      verifiedIncentive: 0,
      assumptions: [
        '공식 세제혜택 후 판매가 사용',
        '세제후 ≠ 취득원가',
        '보조금 미반영',
        ...INTERNAL_ASSUMPTIONS,
      ],
      evidenceNotes: {
        official: ['기아 공식 세제혜택 후 판매가'],
        internalAssumption: INTERNAL_ASSUMPTIONS,
        unverified: ['보조금', '취득원가 추가 할인'],
      },
    },
    {
      id: 'C_after_tax_acq_5m',
      label: 'C. 세제후 + 취득원가 가상 −500만',
      vehiclePriceBasis: 'afterTaxBenefit',
      hypotheticalAcquisitionReduction: -5_000_000,
      priceAdjustmentMode: 'acquisition_discount_only',
      verifiedIncentive: 0,
      assumptions: [
        '판매가·잔가 = 세제후 고정',
        '취득원가만 −500만 (가상)',
        '확정 보조금으로 표시 금지',
        ...INTERNAL_ASSUMPTIONS,
      ],
      evidenceNotes: {
        official: ['세제후 판매가'],
        internalAssumption: INTERNAL_ASSUMPTIONS,
        unverified: ['500만 취득 차감은 가상 시나리오'],
      },
    },
    {
      id: 'D_after_tax_acq_7m',
      label: 'D. 세제후 + 취득원가 가상 −700만',
      vehiclePriceBasis: 'afterTaxBenefit',
      hypotheticalAcquisitionReduction: -7_000_000,
      priceAdjustmentMode: 'acquisition_discount_only',
      verifiedIncentive: 0,
      assumptions: [
        '판매가·잔가 = 세제후 고정',
        '취득원가만 −700만 (가상)',
        '확정 보조금으로 표시 금지',
        ...INTERNAL_ASSUMPTIONS,
      ],
      evidenceNotes: {
        official: ['세제후 판매가'],
        internalAssumption: INTERNAL_ASSUMPTIONS,
        unverified: ['700만 취득 차감은 가상 시나리오'],
      },
    },
    {
      id: 'E_after_tax_hypo_national_subsidy',
      label: `E. 세제후 + 국비 가상 전액 반영(${(national.amountWon / 10_000).toFixed(0)}만)`,
      vehiclePriceBasis: 'afterTaxBenefit',
      hypotheticalAcquisitionReduction: -national.amountWon,
      priceAdjustmentMode: 'acquisition_discount_only',
      verifiedIncentive: 0,
      assumptions: [
        `국비 공시 ${national.amountWon.toLocaleString('ko-KR')}원 (${national.registryKey})`,
        '판매가·잔가 고정, 취득원가만 가상 차감',
        '렌트사 수령·고객 전가 미검증 → hypothetical만',
        '지방비 미포함',
        ...INTERNAL_ASSUMPTIONS,
      ],
      evidenceNotes: {
        official: ['세제후 판매가', `국비 공시액(${national.registryKey})`],
        internalAssumption: INTERNAL_ASSUMPTIONS,
        unverified: [
          'lessorReceiptStatus',
          'verifiedPassThroughAmount',
          '지방비',
        ],
      },
    },
  ]

  if (trimId === 'STANDARD_AIR') {
    base.push(
      {
        id: 'AIR_after_tax_acq_4m',
        label: '에어 참고: 세제후 + 취득 −400만',
        vehiclePriceBasis: 'afterTaxBenefit',
        hypotheticalAcquisitionReduction: -4_000_000,
        priceAdjustmentMode: 'acquisition_discount_only',
        verifiedIncentive: 0,
        assumptions: ['STEP7.2 참고 시뮬레이션', ...INTERNAL_ASSUMPTIONS],
        evidenceNotes: {
          official: ['세제후 판매가'],
          internalAssumption: INTERNAL_ASSUMPTIONS,
          unverified: ['400만 가상 차감'],
        },
      },
      {
        id: 'AIR_after_tax_acq_6m',
        label: '에어 참고: 세제후 + 취득 −600만',
        vehiclePriceBasis: 'afterTaxBenefit',
        hypotheticalAcquisitionReduction: -6_000_000,
        priceAdjustmentMode: 'acquisition_discount_only',
        verifiedIncentive: 0,
        assumptions: ['STEP7.2 참고 시뮬레이션', ...INTERNAL_ASSUMPTIONS],
        evidenceNotes: {
          official: ['세제후 판매가'],
          internalAssumption: INTERNAL_ASSUMPTIONS,
          unverified: ['600만 가상 차감'],
        },
      },
    )
  }

  return base
}

export const KIA_OFFICIAL_PRICE_PAGE =
  'https://www.kia.com/kr/vehicles/ev3/price/'

/** 사용자 PDF·장부·공식 사이트 대조용 기대값 */
export const EXPECTED_OFFICIAL_TRIM_PRICES: Record<
  TrimId,
  { before: number; after: number }
> = {
  STANDARD_AIR: { before: 42_030_000, after: 39_950_000 },
  STANDARD_EARTH: { before: 46_180_000, after: 43_900_000 },
  STANDARD_GT_LINE: { before: 47_080_000, after: 44_750_000 },
  LONG_RANGE_AIR: { before: 46_450_000, after: 44_150_000 },
  LONG_RANGE_EARTH: { before: 50_600_000, after: 48_100_000 },
  LONG_RANGE_GT_LINE: { before: 51_500_000, after: 48_950_000 },
}
