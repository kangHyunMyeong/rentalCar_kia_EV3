import type { RentalTrim, TrimId } from '@/types'

/**
 * Rental Estimate 트림 6종.
 * 추후 API 응답으로 교체 가능한 데이터 계층입니다.
 */
export const RENTAL_TRIMS: RentalTrim[] = [
  {
    id: 'STANDARD_AIR',
    name: '스탠다드 에어',
    battery: 'standard',
    grade: 'air',
    available: true,
    imageKey: 'trimAir',
    sortOrder: 1,
  },
  {
    id: 'STANDARD_EARTH',
    name: '스탠다드 어스',
    battery: 'standard',
    grade: 'earth',
    available: true,
    imageKey: 'trimEarth',
    sortOrder: 2,
  },
  {
    id: 'STANDARD_GT_LINE',
    name: '스탠다드 GT-Line',
    battery: 'standard',
    grade: 'gt-line',
    available: true,
    imageKey: 'trimGtLine',
    sortOrder: 3,
  },
  {
    id: 'LONG_RANGE_AIR',
    name: '롱레인지 에어',
    battery: 'long-range',
    grade: 'air',
    available: true,
    imageKey: 'trimAir',
    sortOrder: 4,
  },
  {
    id: 'LONG_RANGE_EARTH',
    name: '롱레인지 어스',
    battery: 'long-range',
    grade: 'earth',
    available: true,
    imageKey: 'trimEarth',
    sortOrder: 5,
  },
  {
    id: 'LONG_RANGE_GT_LINE',
    name: '롱레인지 GT-Line',
    battery: 'long-range',
    grade: 'gt-line',
    available: true,
    imageKey: 'trimGtLine',
    sortOrder: 6,
  },
]

export const DEFAULT_RENTAL_TRIM_ID: TrimId = 'LONG_RANGE_EARTH'

export function getRentalTrimById(id: TrimId): RentalTrim | undefined {
  return RENTAL_TRIMS.find((trim) => trim.id === id)
}
