/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** simulation|demo|none: 참고용 시뮬레이션 / api|verified: 검증 요율만 (미연결 시 금액 미표시) */
  readonly VITE_PRICING_MODE?: 'none' | 'demo' | 'simulation' | 'api' | 'verified'
  /**
   * FITCAR TRUST 통계 모드
   * - demo: 디자인 검토용 샘플 (안내 문구 필수)
   * - live: 검증된 실적만
   * - hidden: 수치 숨김
   * 미설정 시 production=live, development=demo
   */
  readonly VITE_TRUST_STATS_MODE?: 'live' | 'demo' | 'hidden'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
