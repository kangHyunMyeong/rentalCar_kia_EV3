export function scrollToSection(sectionId: string): void {
  const el = document.getElementById(sectionId)
  if (!el) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
