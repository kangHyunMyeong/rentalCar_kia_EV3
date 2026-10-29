import type { ExteriorColorId, TrimId } from '@/types'

/**
 * 사용자 제공 price_ev3.pdf(2026 EV3) 선택옵션·외장색 가격.
 * 모든 금액은 세제혜택 적용 전(원). 옵션 세제후 별도표 없음 → 임의 세금 계산 금지.
 */

export type Ev3TrimGrade = 'air' | 'earth' | 'gt-line'
export type Ev3Battery = 'standard' | 'long-range'

export type Ev3OptionAvailability = 'included' | 'available' | 'unavailable'

export type Ev3OptionId =
  | 'style'
  | 'comfort1'
  | 'comfort2'
  | 'convenience'
  | 'wheel19'
  | 'monitoring'
  | 'driveWise'
  | 'wideSunroof'
  | 'harmanKardon'
  | 'builtinCam2'
  | 'hud'
  | 'aftermarketCollection'
  | 'dualMotor4wd'

export type Ev3InteriorId =
  | 'medium_gray'
  | 'navy'
  | 'light_gray'
  | 'charcoal_white'

export interface Ev3OptionGradePrice {
  availability: Ev3OptionAvailability
  /** available일 때만 유의미. included/unavailable은 0 */
  priceBeforeTax: number
}

export interface Ev3OptionDefinition {
  id: Ev3OptionId
  label: string
  byGrade: Record<Ev3TrimGrade, Ev3OptionGradePrice>
}

export const EV3_PDF_PRICE_META = {
  source: 'user-provided price_ev3.pdf',
  modelYear: '2026',
  currency: 'KRW',
  optionTaxBenefit: 'unconfirmed' as const,
  note: '트림 기본가·옵션·외장색은 PDF 세제전 표기. 옵션 세제후 미제공.',
}

/** 외장색 추가금액 (세제전) — PDF */
export const EV3_EXTERIOR_COLOR_PRICES: Record<
  ExteriorColorId,
  { label: string; priceBeforeTax: number }
> = {
  SWP: { label: '스노우 화이트 펄', priceBeforeTax: 80_000 },
  ISG: { label: '아이보리 실버', priceBeforeTax: 0 },
  ISM: { label: '아이보리 매트 실버', priceBeforeTax: 300_000 },
  ABP: { label: '오로라 블랙 펄', priceBeforeTax: 0 },
  EBD: { label: '셰일 그레이', priceBeforeTax: 0 },
  AG3: { label: '어벤쳐린 그린', priceBeforeTax: 0 },
  EBB: { label: '프로스트 블루', priceBeforeTax: 0 },
}

/** 실내색 — 추가금액 없음(PDF 미표기). 트림 제한만 */
export const EV3_INTERIOR_COLORS: Record<
  Ev3InteriorId,
  { label: string; allowedGrades: Ev3TrimGrade[] }
> = {
  medium_gray: { label: '미디움 그레이', allowedGrades: ['air', 'earth'] },
  navy: { label: '네이비', allowedGrades: ['air', 'earth'] },
  light_gray: { label: '라이트 그레이', allowedGrades: ['earth'] },
  charcoal_white: { label: '차콜&화이트', allowedGrades: ['gt-line'] },
}

export const EV3_OPTIONS: Ev3OptionDefinition[] = [
  {
    id: 'style',
    label: '스타일',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 940_000 },
      earth: { availability: 'included', priceBeforeTax: 0 },
      'gt-line': { availability: 'included', priceBeforeTax: 0 },
    },
  },
  {
    id: 'comfort1',
    label: '컴포트 I',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 490_000 },
      earth: { availability: 'included', priceBeforeTax: 0 },
      'gt-line': { availability: 'included', priceBeforeTax: 0 },
    },
  },
  {
    id: 'comfort2',
    label: '컴포트 II',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 890_000 },
      earth: { availability: 'included', priceBeforeTax: 0 },
      'gt-line': { availability: 'included', priceBeforeTax: 0 },
    },
  },
  {
    id: 'convenience',
    label: '컨비니언스',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 1_290_000 },
      earth: { availability: 'included', priceBeforeTax: 0 },
      'gt-line': { availability: 'included', priceBeforeTax: 0 },
    },
  },
  {
    id: 'wheel19',
    label: '19인치 휠 & 타이어',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 490_000 },
      earth: { availability: 'available', priceBeforeTax: 490_000 },
      'gt-line': { availability: 'included', priceBeforeTax: 0 },
    },
  },
  {
    id: 'monitoring',
    label: '모니터링',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 1_040_000 },
      earth: { availability: 'available', priceBeforeTax: 1_040_000 },
      'gt-line': { availability: 'available', priceBeforeTax: 1_040_000 },
    },
  },
  {
    id: 'driveWise',
    label: '드라이브 와이즈',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 1_090_000 },
      earth: { availability: 'available', priceBeforeTax: 1_090_000 },
      'gt-line': { availability: 'available', priceBeforeTax: 1_090_000 },
    },
  },
  {
    id: 'wideSunroof',
    label: '와이드 선루프',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 640_000 },
      earth: { availability: 'available', priceBeforeTax: 640_000 },
      'gt-line': { availability: 'available', priceBeforeTax: 640_000 },
    },
  },
  {
    id: 'harmanKardon',
    label: '하만카돈 프리미엄 사운드',
    byGrade: {
      air: { availability: 'unavailable', priceBeforeTax: 0 },
      earth: { availability: 'available', priceBeforeTax: 590_000 },
      'gt-line': { availability: 'available', priceBeforeTax: 590_000 },
    },
  },
  {
    id: 'builtinCam2',
    label: '빌트인 캠 2 플러스',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 450_000 },
      earth: { availability: 'available', priceBeforeTax: 450_000 },
      'gt-line': { availability: 'available', priceBeforeTax: 450_000 },
    },
  },
  {
    id: 'hud',
    label: '헤드업 디스플레이',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 590_000 },
      earth: { availability: 'available', priceBeforeTax: 590_000 },
      'gt-line': { availability: 'available', priceBeforeTax: 590_000 },
    },
  },
  {
    id: 'aftermarketCollection',
    label: '애프터마켓용 컬렉션',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 150_000 },
      earth: { availability: 'available', priceBeforeTax: 150_000 },
      'gt-line': { availability: 'unavailable', priceBeforeTax: 0 },
    },
  },
  {
    id: 'dualMotor4wd',
    label: '듀얼 모터 4WD',
    byGrade: {
      air: { availability: 'available', priceBeforeTax: 2_270_000 },
      earth: { availability: 'available', priceBeforeTax: 2_270_000 },
      'gt-line': { availability: 'available', priceBeforeTax: 2_270_000 },
    },
  },
]

export function getTrimGrade(trimId: TrimId): Ev3TrimGrade {
  if (trimId.includes('GT_LINE')) return 'gt-line'
  if (trimId.includes('EARTH')) return 'earth'
  return 'air'
}

export function getTrimBattery(trimId: TrimId): Ev3Battery {
  return trimId.startsWith('LONG_RANGE') ? 'long-range' : 'standard'
}

export function getOptionDefinition(id: Ev3OptionId): Ev3OptionDefinition | undefined {
  return EV3_OPTIONS.find((o) => o.id === id)
}
