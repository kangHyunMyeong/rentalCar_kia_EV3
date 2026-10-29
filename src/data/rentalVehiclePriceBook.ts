import type { TrimId } from '@/types'
import { RENTAL_VEHICLE_PRICES } from '@/data/rentalVehiclePrices'

/**
 * 트림별 차량가 이중 장부.
 * - beforeTaxBenefit: 기아 공식 가격표 세제혜택 전
 * - afterTaxBenefit: 친환경차 세제혜택 후
 *
 * 출처: 기아 EV3 가격표 (price_ev3.pdf, 2026년형)
 * 기존 V2(`RENTAL_VEHICLE_PRICES`)는 변경하지 않으며 beforeTaxBenefit과 동일합니다.
 */
export interface VehiclePriceBookEntry {
  vehiclePriceBeforeTaxBenefit: number
  vehiclePriceAfterTaxBenefit: number
  source: string
  sourceNote: string
}

/** 선납·보증 % 적용 시 사용할 기준가 선택 */
export type VehiclePriceBasis = 'beforeTaxBenefit' | 'afterTaxBenefit'

export const RENTAL_VEHICLE_PRICE_BOOK: Record<TrimId, VehiclePriceBookEntry> = {
  STANDARD_AIR: {
    vehiclePriceBeforeTaxBenefit: 42_030_000,
    vehiclePriceAfterTaxBenefit: 39_950_000,
    source: 'kia-official-price-list-2026',
    sourceNote: '기아 공식 가격표 — 에어 스탠다드',
  },
  STANDARD_EARTH: {
    vehiclePriceBeforeTaxBenefit: 46_180_000,
    vehiclePriceAfterTaxBenefit: 43_900_000,
    source: 'kia-official-price-list-2026',
    sourceNote: '기아 공식 가격표 — 어스 스탠다드',
  },
  STANDARD_GT_LINE: {
    vehiclePriceBeforeTaxBenefit: 47_080_000,
    vehiclePriceAfterTaxBenefit: 44_750_000,
    source: 'kia-official-price-list-2026',
    sourceNote: '기아 공식 가격표 — GT-Line 스탠다드',
  },
  LONG_RANGE_AIR: {
    vehiclePriceBeforeTaxBenefit: 46_450_000,
    vehiclePriceAfterTaxBenefit: 44_150_000,
    source: 'kia-official-price-list-2026',
    sourceNote: '기아 공식 가격표 — 에어 롱레인지',
  },
  LONG_RANGE_EARTH: {
    vehiclePriceBeforeTaxBenefit: 50_600_000,
    vehiclePriceAfterTaxBenefit: 48_100_000,
    source: 'kia-official-price-list-2026',
    sourceNote: '기아 공식 가격표 — 어스 롱레인지',
  },
  LONG_RANGE_GT_LINE: {
    vehiclePriceBeforeTaxBenefit: 51_500_000,
    vehiclePriceAfterTaxBenefit: 48_950_000,
    source: 'kia-official-price-list-2026',
    sourceNote: '기아 공식 가격표 — GT-Line 롱레인지',
  },
}

export function getVehiclePriceBookEntry(
  trimId: TrimId,
): VehiclePriceBookEntry | undefined {
  return RENTAL_VEHICLE_PRICE_BOOK[trimId]
}

export function resolveVehiclePrice(
  trimId: TrimId,
  basis: VehiclePriceBasis,
): number | undefined {
  const entry = getVehiclePriceBookEntry(trimId)
  if (!entry) return undefined
  const price =
    basis === 'afterTaxBenefit'
      ? entry.vehiclePriceAfterTaxBenefit
      : entry.vehiclePriceBeforeTaxBenefit
  return typeof price === 'number' && Number.isFinite(price) && price > 0
    ? price
    : undefined
}

/** V2 가격표와 beforeTaxBenefit 장부가 일치하는지 점검용 */
export function assertPriceBookAlignedWithV2(): boolean {
  return (Object.keys(RENTAL_VEHICLE_PRICES) as TrimId[]).every(
    (trimId) =>
      RENTAL_VEHICLE_PRICE_BOOK[trimId]?.vehiclePriceBeforeTaxBenefit ===
      RENTAL_VEHICLE_PRICES[trimId],
  )
}
