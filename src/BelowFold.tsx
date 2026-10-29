/**
 * KV 이하 섹션 — 초기 JS 파싱/실행을 줄이기 위해 별도 청크로 분리.
 * Hero/Header는 App에서 동기 로드 유지.
 */
import { WhyEv3 } from '@/components/features/WhyEv3'
import { DesignInterior } from '@/components/gallery/DesignInterior'
import { ColorStudio } from '@/components/color-studio/ColorStudio'
import { RentalEstimateSection } from '@/components/quote/RentalEstimateSection'
import { FaqSection } from '@/components/faq/FaqSection'
import { ClosingConsultationCta } from '@/components/faq/ClosingConsultationCta'
import { Footer } from '@/components/layout/Footer'
import { FloatingEstimateBar } from '@/components/layout/FloatingEstimateBar'

export function BelowFold() {
  return (
    <>
      <WhyEv3 />
      <DesignInterior />
      <ColorStudio />
      <RentalEstimateSection />
      <FaqSection />
      <ClosingConsultationCta />
      <Footer />
      <FloatingEstimateBar />
    </>
  )
}
