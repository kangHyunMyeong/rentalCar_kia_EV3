/**
 * V5는 로컬(DEV)에서만 선택 가능.
 * 운영(PROD)은 항상 기존 V2 경로를 유지합니다.
 */
export type PricingEngineId = 'v2' | 'v5'

export function resolvePricingEngineId(): PricingEngineId {
  const requested = import.meta.env.VITE_PRICING_ENGINE
  if (requested === 'v5') {
    if (import.meta.env.DEV) {
      return 'v5'
    }
    // 운영에서 v5 요청이 와도 V2 유지
    return 'v2'
  }
  return 'v2'
}

export function isV5LocalEnabled(): boolean {
  return resolvePricingEngineId() === 'v5'
}
