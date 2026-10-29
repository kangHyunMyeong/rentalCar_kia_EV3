import { DEPOSIT_ANNUAL_DISCOUNT_RATE } from '@/data/rentalSimulationConfig'
import type { AnnualMileage } from '@/types'
import type { V5EvidenceKind } from './types'

/**
 * V5 설정 — 기준요율에 보험·세금·보조금이 이미 포함됐을 수 있어
 * 해당 항목을 월액에 재가산하지 않습니다.
 */

export const V5_ENGINE_META = {
  version: '2026-10-29-v5',
  engineId: 'market-reference-flat-pn-v5',
  disclaimer:
    '시장 참고요율 기반 예상 견적입니다. 확정 계약가가 아니며 상담 시 달라질 수 있습니다.',
}

/** 보증금 연 할인율 — 기존 내부 가정 유지(임의 변경 금지) */
export const V5_DEPOSIT_ANNUAL_DISCOUNT = {
  value: DEPOSIT_ANNUAL_DISCOUNT_RATE,
  evidence: 'internal_assumption' as V5EvidenceKind,
  note: '연 2% 내부 가정. 렌트사 공식 할인율이 아님. STEP8에서 임의 변경하지 않음.',
}

/**
 * 주행거리 월액 가감 — 독립 모듈용 내부 가정.
 * 기준 20,000km = 0. 공식 요율표 아님.
 */
export const V5_MILEAGE_MONTHLY_DELTA: {
  value: Record<Exclude<AnnualMileage, 'unlimited'> | 'unlimited', number>
  evidence: V5EvidenceKind
  note: string
} = {
  value: {
    10000: -20_000,
    15000: -10_000,
    20000: 0,
    30000: 25_000,
    unlimited: 0, // 무제한은 상담 — 수치 미사용
  },
  evidence: 'internal_assumption',
  note: '기준요율(20,000km) 대비 월액 가감 내부 가정. 시장 공식표 아님.',
}

/**
 * 옵션·외장색 원가 → 월액 환산 계수.
 * 확인되지 않은 조정계수 → internal_assumption.
 * monthly = (options+color) / contractMonths * factor
 */
export const V5_OPTION_COLOR_AMORTIZATION = {
  /** 1.0 = 단순 월할. 금융·마진 미반영 */
  factor: 1,
  evidence: 'internal_assumption' as V5EvidenceKind,
  note: '옵션·색상 추가금을 계약월수로 단순 월할. 공식 렌트 할증 요율 아님.',
}

/** 기준요율에 이미 포함됐을 수 있어 재가산 금지 항목 */
export const V5_ALREADY_IN_BASE_RATE = [
  'insurance',
  'vehicle_tax',
  'subsidy_effect_if_any',
  'base_maintenance_package_unknown',
] as const

/** 선납·보증 % 기준가 — 세제전 장부 (변경 금지, 검증 필요 가정) */
export const V5_PREPAY_DEPOSIT_PRICE_BASIS = {
  value: 'beforeTaxBenefit' as const,
  evidence: 'internal_assumption' as V5EvidenceKind,
  note: '선납·보증은 세제전 차량 기준가 × %. 실제 계약 산정 기준과 동일한지는 미검증.',
}
