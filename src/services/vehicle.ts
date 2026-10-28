import { EV3_MODEL } from '@/data/ev3-model'
import { RENTAL_TRIMS } from '@/data/rental-trims'
import { RENTAL_CONDITIONS } from '@/data/rental-conditions'
import type { EV3Model, RentalCondition, RentalTrim } from '@/types'

/** 차량·트림·조건 조회. 향후 관리자 API로 교체 가능한 계층 */
export async function fetchEV3Model(): Promise<EV3Model> {
  return EV3_MODEL
}

export async function fetchRentalTrims(): Promise<RentalTrim[]> {
  return RENTAL_TRIMS.filter((t) => t.available).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function fetchRentalConditions(): Promise<RentalCondition> {
  return RENTAL_CONDITIONS
}
