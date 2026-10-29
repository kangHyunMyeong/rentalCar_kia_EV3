/**
 * 섹션 스크롤. BelowFold lazy 로드로 타깃이 잠시 없을 수 있어
 * 짧은 시간 재시도합니다 (디자인/동작 변경 없음).
 */
export function scrollToSection(sectionId: string): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const tryScroll = (): boolean => {
    const el = document.getElementById(sectionId)
    if (!el) return false
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    return true
  }

  if (tryScroll()) return

  const started = performance.now()
  const timer = window.setInterval(() => {
    if (tryScroll() || performance.now() - started > 4000) {
      window.clearInterval(timer)
    }
  }, 50)
}
