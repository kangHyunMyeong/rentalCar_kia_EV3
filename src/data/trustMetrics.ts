/**
 * 핏카컴퍼니 신뢰 지표.
 *
 * - live: 검증된 실적만 표시 (value + verified)
 * - demo: 디자인 검토용 샘플 수치 (운영 기본값 아님, 안내 문구 필수)
 * - hidden: 수치 영역 숨김
 *
 * VITE_TRUST_STATS_MODE 로 제어. 미설정 시:
 * - production → live
 * - development → demo (로컬 디자인 검토용)
 */

export type TrustStatsMode = 'live' | 'demo' | 'hidden'

export interface TrustMetricItem {
  id: 'consultations' | 'contracts' | 'reviews'
  label: string
  value: number | null
  suffix: string
  verified: boolean
}

export interface TrustMetricsMeta {
  eyebrow: string
  headline: string
  emptyStateBody: string
  scopeNote: string
  /** YYYY-MM-DD — 검증된 live 수치가 있을 때만 노출 */
  asOfDate: string | null
  demoDisclaimer: string
}

export const TRUST_METRICS_META: TrustMetricsMeta = {
  eyebrow: 'FITCAR / IN NUMBERS',
  headline: '고객과 함께 쌓아온\n상담의 경험.',
  emptyStateBody:
    '핏카컴퍼니는 장기렌트 상담을 통해\n고객의 조건에 맞는 계약을 함께 설계합니다.',
  scopeNote: '핏카컴퍼니 전체 장기렌트 서비스 기준',
  asOfDate: null,
  demoDisclaimer:
    '※ 디자인 검토용 샘플 수치이며\n실제 상담·계약 실적이 아닙니다.',
}

/** 운영 실적 — 확정 후 value / verified / asOfDate 만 갱신 */
export const TRUST_METRICS_LIVE = {
  consultations: {
    id: 'consultations',
    label: '누적 장기렌트 상담',
    value: null as number | null,
    suffix: '건',
    verified: false,
  },
  contracts: {
    id: 'contracts',
    label: '실제 계약·출고',
    value: null as number | null,
    suffix: '건',
    verified: false,
  },
  reviews: {
    id: 'reviews',
    label: '고객 후기',
    value: null as number | null,
    suffix: '건',
    verified: false,
  },
} as const satisfies Record<string, TrustMetricItem>

/** 디자인·CountUp 검토용 샘플 (실적 아님) */
export const TRUST_METRICS_DEMO = {
  consultations: {
    id: 'consultations',
    label: '누적 장기렌트 상담',
    value: 2480,
    suffix: '건',
    verified: false,
  },
  contracts: {
    id: 'contracts',
    label: '실제 계약·출고',
    value: 742,
    suffix: '건',
    verified: false,
  },
  reviews: {
    id: 'reviews',
    label: '고객 후기',
    value: 186,
    suffix: '건',
    verified: false,
  },
} as const satisfies Record<string, TrustMetricItem>

const METRIC_ORDER: TrustMetricItem['id'][] = [
  'consultations',
  'contracts',
  'reviews',
]

export function resolveTrustStatsMode(): TrustStatsMode {
  const raw = import.meta.env.VITE_TRUST_STATS_MODE
  if (raw === 'demo' || raw === 'live' || raw === 'hidden') return raw
  // 운영 빌드는 기본적으로 검증 실적만 (미확정이면 수치 미표시)
  if (import.meta.env.PROD) return 'live'
  return 'demo'
}

export function resolveTrustMetrics(): {
  mode: TrustStatsMode
  meta: TrustMetricsMeta
  metrics: TrustMetricItem[]
  displayMetrics: TrustMetricItem[]
  isDemo: boolean
} {
  const mode = resolveTrustStatsMode()
  const meta = { ...TRUST_METRICS_META }

  if (mode === 'hidden') {
    return { mode, meta, metrics: [], displayMetrics: [], isDemo: false }
  }

  if (mode === 'demo') {
    const metrics = METRIC_ORDER.map((id) => ({ ...TRUST_METRICS_DEMO[id] }))
    return {
      mode,
      meta,
      metrics,
      displayMetrics: metrics,
      isDemo: true,
    }
  }

  // live — 검증된 수치만 노출. 미등록이면 빈 영역 대신 demo 샘플+고지
  const metrics = METRIC_ORDER.map((id) => ({ ...TRUST_METRICS_LIVE[id] }))
  const displayMetrics = metrics.filter(
    (m) =>
      m.verified &&
      m.value != null &&
      Number.isFinite(m.value) &&
      m.value >= 0,
  )

  if (displayMetrics.length === 0) {
    const demoMetrics = METRIC_ORDER.map((id) => ({ ...TRUST_METRICS_DEMO[id] }))
    return {
      mode: 'demo',
      meta,
      metrics: demoMetrics,
      displayMetrics: demoMetrics,
      isDemo: true,
    }
  }

  return {
    mode,
    meta: {
      ...meta,
      asOfDate: displayMetrics.length > 0 ? meta.asOfDate : null,
    },
    metrics,
    displayMetrics,
    isDemo: false,
  }
}

export function formatTrustAsOfDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}
