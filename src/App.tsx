import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/hero/HeroSection'
import { WhyEv3 } from '@/components/features/WhyEv3'
import { DesignInterior } from '@/components/gallery/DesignInterior'
import { ColorStudio } from '@/components/color-studio/ColorStudio'
import { FaqSection } from '@/components/faq/FaqSection'
import { ClosingConsultationCta } from '@/components/faq/ClosingConsultationCta'
import { RentalEstimateSection } from '@/components/quote/RentalEstimateSection'

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">
        본문으로 건너뛰기
      </a>
      <Header />
      <main id="main">
        <HeroSection />
        <WhyEv3 />
        <DesignInterior />
        <ColorStudio />
        <RentalEstimateSection />
        <FaqSection />
        <ClosingConsultationCta />
      </main>
      <Footer />
    </>
  )
}
