/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** simulation|demo|none: 참고용 시뮬레이션 / api|verified: 검증 요율만 (미연결 시 금액 미표시) */
  readonly VITE_PRICING_MODE?: 'none' | 'demo' | 'simulation' | 'api' | 'verified'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
