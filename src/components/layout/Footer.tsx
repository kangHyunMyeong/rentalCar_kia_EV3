import { useEffect, useId, useRef, useState } from 'react'
import { Container } from '@/components/ui/Container'
import { COMPANY_INFO, FOOTER_POLICIES, type FooterPolicyId } from '@/data/company'

function PolicyModal({
  policyId,
  onClose,
}: {
  policyId: FooterPolicyId
  onClose: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const policy = FOOTER_POLICIES[policyId]

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0f1a1a]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[88svh] w-full overflow-y-auto rounded-t-[16px] bg-[#F7F9F8] sm:max-w-xl sm:rounded-[16px]">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#D8D8D4] bg-[#F7F9F8] px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-[#14282A]">
            {policy.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-[#7A817E] hover:bg-[#E8ECEB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C]"
            onClick={onClose}
            aria-label="닫기"
          >
            닫기
          </button>
        </div>
        <div className="space-y-4 px-5 py-5 text-[0.9rem] leading-[1.7] text-[#475569]">
          {policy.sections.map((section) => (
            <p key={section.heading}>
              <strong className="font-semibold text-[#14282A]">{section.heading}</strong>
              <br />
              {section.body}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  const [activePolicy, setActivePolicy] = useState<FooterPolicyId | null>(null)

  const metaItems = [
    { label: '상호명', value: COMPANY_INFO.legalName },
    { label: '대표자명', value: COMPANY_INFO.representative },
    { label: '사업자등록번호', value: COMPANY_INFO.businessNumber },
    { label: '사업장 주소', value: COMPANY_INFO.address },
  ]

  return (
    <footer id="site-footer" className="border-t border-[#D8D8D4] bg-[#F5F4F0] text-[#14282A]">
      <Container className="max-w-[1280px] px-5 py-12 md:px-12 md:py-16 lg:px-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:gap-16">
          <div>
            <p className="text-[0.8rem] font-semibold tracking-[0.16em] text-[#103C3C] uppercase">
              {COMPANY_INFO.brandNameEn}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#14282A]">
              {COMPANY_INFO.brandNameKo}
            </p>
            <p className="mt-2 text-[0.98rem] text-[#7A817E]">{COMPANY_INFO.tagline}</p>
          </div>

          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {metaItems.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-[0.8rem] tracking-wide text-[#7A817E]">{item.label}</dt>
                <dd className="mt-1 text-[0.98rem] leading-relaxed break-keep text-[#14282A] md:text-base">
                  {item.value}
                </dd>
              </div>
            ))}
            {COMPANY_INFO.phone ? (
              <div className="min-w-0">
                <dt className="text-[0.8rem] tracking-wide text-[#7A817E]">상담 전화번호</dt>
                <dd className="mt-1 text-[0.98rem] md:text-base">
                  <a
                    href={`tel:${COMPANY_INFO.phone.replace(/[^0-9+]/g, '')}`}
                    className="text-[#14282A] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C]"
                  >
                    {COMPANY_INFO.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {COMPANY_INFO.email ? (
              <div className="min-w-0">
                <dt className="text-[0.8rem] tracking-wide text-[#7A817E]">이메일</dt>
                <dd className="mt-1 text-[0.98rem] md:text-base">
                  <a
                    href={`mailto:${COMPANY_INFO.email}`}
                    className="text-[#14282A] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C]"
                  >
                    {COMPANY_INFO.email}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[#D8D8D4] pt-6 sm:flex-row sm:items-center sm:justify-between md:mt-10">
          <p className="text-[0.85rem] text-[#7A817E]">
            © {year} {COMPANY_INFO.brandNameKo}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9rem]">
            <button
              type="button"
              className="text-[#14282A] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C]"
              onClick={() => setActivePolicy('privacy')}
            >
              {FOOTER_POLICIES.privacy.label}
            </button>
            <span aria-hidden className="text-[#D8D8D4]">
              |
            </span>
            <button
              type="button"
              className="text-[#14282A] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#103C3C]"
              onClick={() => setActivePolicy('terms')}
            >
              {FOOTER_POLICIES.terms.label}
            </button>
          </div>
        </div>
      </Container>

      {activePolicy ? (
        <PolicyModal policyId={activePolicy} onClose={() => setActivePolicy(null)} />
      ) : null}
    </footer>
  )
}
