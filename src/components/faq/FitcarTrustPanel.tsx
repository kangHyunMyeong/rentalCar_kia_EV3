import { useEffect, useMemo, useRef } from 'react'
import {
  formatTrustAsOfDate,
  resolveTrustMetrics,
  type TrustMetricItem,
} from '@/data/trustMetrics'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}

function MetricBlock({
  metric,
  variant,
  countRef,
}: {
  metric: TrustMetricItem
  variant: 'primary' | 'secondary'
  countRef?: (el: HTMLSpanElement | null) => void
}) {
  const value = metric.value ?? 0

  return (
    <div className={['trust-metric', `trust-metric--${variant}`].join(' ')}>
      <p className="trust-metric__label">{metric.label}</p>
      <p className="trust-metric__value">
        <span
          ref={countRef}
          className="trust-metric__num"
          data-count-to={value}
        >
          {formatCount(value)}
        </span>
        <span className="trust-metric__suffix">{metric.suffix}</span>
      </p>
    </div>
  )
}

export function FitcarTrustPanel() {
  const rootRef = useRef<HTMLDivElement>(null)
  const countEls = useRef<(HTMLSpanElement | null)[]>([])
  const reduced = usePrefersReducedMotion()
  const { meta, displayMetrics, isDemo } = useMemo(() => resolveTrustMetrics(), [])
  const asOfLabel = formatTrustAsOfDate(meta.asOfDate)

  const primary = displayMetrics[0] ?? null
  const secondary = displayMetrics.slice(1)

  useEffect(() => {
    if (!rootRef.current || reduced || displayMetrics.length === 0) return

    let disposed = false
    let ctx: { revert: () => void } | null = null

    void (async () => {
      const gsap = (await import('gsap')).default
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      if (disposed || !rootRef.current) return
      gsap.registerPlugin(ScrollTrigger)

      ctx = gsap.context(() => {
        countEls.current.forEach((el, index) => {
          if (!el) return
          const target = Number(el.dataset.countTo)
          if (!Number.isFinite(target)) return

          const state = { value: 0 }
          el.textContent = '0'

          gsap.to(state, {
            value: target,
            duration: 1.5,
            delay: index * 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 60%',
              once: true,
            },
            onUpdate: () => {
              el.textContent = formatCount(state.value)
            },
            onComplete: () => {
              el.textContent = formatCount(target)
            },
          })
        })
      }, rootRef)
    })()

    return () => {
      disposed = true
      ctx?.revert()
    }
  }, [reduced, displayMetrics.length])

  const setCountRef = (index: number) => (el: HTMLSpanElement | null) => {
    countEls.current[index] = el
  }

  return (
    <div ref={rootRef} className="fitcar-trust">
      <p className="fitcar-trust__eyebrow">{meta.eyebrow}</p>
      <p className="fitcar-trust__headline">
        {meta.headline.split('\n').map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>

      {primary ? (
        <div className="fitcar-trust__stats">
          <MetricBlock metric={primary} variant="primary" countRef={setCountRef(0)} />

          {secondary.length > 0 ? (
            <>
              <div className="fitcar-trust__rule" aria-hidden />
              <div
                className={[
                  'fitcar-trust__subgrid',
                  secondary.length === 1 ? 'is-single' : '',
                ].join(' ')}
              >
                {secondary.map((metric, i) => (
                  <MetricBlock
                    key={metric.id}
                    metric={metric}
                    variant="secondary"
                    countRef={setCountRef(i + 1)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <p className="fitcar-trust__empty">{meta.emptyStateBody}</p>
      )}

      <div className="fitcar-trust__meta">
        <p>{meta.scopeNote}</p>
        {asOfLabel ? <p className="fitcar-trust__asof">집계 기준일 {asOfLabel}</p> : null}
        {isDemo ? (
          <p className="fitcar-trust__demo-note">
            {meta.demoDisclaimer.split('\n').map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  )
}
