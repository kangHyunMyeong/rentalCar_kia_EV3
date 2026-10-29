import { lazy, Suspense, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { HeroSection } from '@/components/hero/HeroSection'
import { scrollToSection } from '@/hooks/useSmoothScroll'

const BelowFold = lazy(() =>
  import('./BelowFold').then((m) => ({ default: m.BelowFold })),
)

/** Idle 이후 below-fold 청크를 미리 받아 스크롤 시 빈 화면을 줄입니다. */
function usePrefetchBelowFold() {
  useEffect(() => {
    let idleId = 0
    let timeoutId = 0

    const prefetch = () => {
      void import('./BelowFold')
    }

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(prefetch, { timeout: 1800 })
    } else {
      timeoutId = window.setTimeout(prefetch, 200)
    }

    return () => {
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])
}

/** 딥링크(#quote 등) — BelowFold 등장 후 스크롤 (재시도는 scrollToSection) */
function useHashScroll() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    scrollToSection(hash)
  }, [])
}

export default function App() {
  usePrefetchBelowFold()
  useHashScroll()

  return (
    <>
      <a href="#main" className="skip-link">
        본문으로 건너뛰기
      </a>
      <Header />
      <main id="main">
        <HeroSection />
        <Suspense fallback={null}>
          <BelowFold />
        </Suspense>
      </main>
    </>
  )
}
