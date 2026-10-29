/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** simulation|demo|none: 참고용 시뮬레이션 / api|verified: 검증 요율만 (미연결 시 금액 미표시) */
  readonly VITE_PRICING_MODE?: 'none' | 'demo' | 'simulation' | 'api' | 'verified'
  /**
   * 계산 엔진 선택. v5는 로컬(DEV)에서만 적용됩니다.
   * 운영 빌드에서는 무시되고 V2 경로를 유지합니다.
   */
  readonly VITE_PRICING_ENGINE?: 'v2' | 'v5'
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
