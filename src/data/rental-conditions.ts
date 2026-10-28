import { DEFAULT_RENTAL_TRIM_ID } from '@/data/rental-trims'
import type { QuoteSelection, RentalCondition } from '@/types'

export const DEFAULT_QUOTE_SELECTION: QuoteSelection = {
  trimId: DEFAULT_RENTAL_TRIM_ID,
  prepaymentPercent: 10,
  depositPercent: 0,
  annualMileage: 20000,
  contractMonths: 60,
}

/**
 * 장기렌트 선택 조건.
 * 실제 렌트사 요율표가 연결되면 disabledCombinations를 API 응답으로 교체합니다.
 */
export const RENTAL_CONDITIONS: RentalCondition = {
  id: 'ev3-default-conditions',
  prepaymentPercents: [0, 10, 20, 30],
  depositPercents: [0, 10, 20, 30],
  annualMileages: [10000, 15000, 20000, 30000, 'unlimited'],
  contractMonths: [36, 48, 60],
  recommended: {
    prepaymentPercent: 10,
    depositPercent: 0,
    annualMileage: 20000,
    contractMonths: 60,
  },
  disabledCombinations: [],
}

export const PREPAYMENT_LABELS: Record<number, string> = {
  0: '0%',
  10: '10%',
  20: '20%',
  30: '30%',
}

export const DEPOSIT_LABELS: Record<number, string> = {
  0: '0%',
  10: '10%',
  20: '20%',
  30: '30%',
}

export const MILEAGE_LABELS: Record<string | number, string> = {
  10000: '10,000km',
  15000: '15,000km',
  20000: '20,000km',
  30000: '30,000km',
  unlimited: '무제한',
}

export const CONTRACT_LABELS: Record<number, string> = {
  36: '36개월',
  48: '48개월',
  60: '60개월',
}

export const CONTRACT_SUB_LABELS: Partial<Record<number, string>> = {
  36: '3년',
  48: '4년',
  60: '5년',
}
