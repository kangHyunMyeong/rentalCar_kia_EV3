import type { TrimId } from '@/types'

/**
 * EV3 트림별 세제혜택 전 판매가격 (원).
 * 공식 가격표 기준. 세제혜택 후 가격을 사용하지 않습니다.
 */
export const RENTAL_VEHICLE_PRICES: Record<TrimId, number> = {
  STANDARD_AIR: 42_030_000,
  STANDARD_EARTH: 46_180_000,
  STANDARD_GT_LINE: 47_080_000,
  LONG_RANGE_AIR: 46_450_000,
  LONG_RANGE_EARTH: 50_600_000,
  LONG_RANGE_GT_LINE: 51_500_000,
}

export function getVehiclePriceBeforeTax(trimId: TrimId): number | undefined {
  const price = RENTAL_VEHICLE_PRICES[trimId]
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : undefined
}
