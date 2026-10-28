import type { GallerySlide } from '@/types'

const ASSET = '/assets/ev3'

export const DESIGN_SECTION = {
  index: '03',
  eyebrow: 'DESIGN & INTERIOR',
  title: '형태는 조용히, 존재는 또렷하게.',
  description: '익스테리어와 인테리어를 실제 EV3 이미지로 살펴보세요.',
} as const

export interface DesignFeatureBlock {
  id: 'exterior' | 'interior'
  category: string
  title: string
  description: string
  mainSrc: string
  mainAlt: string
  /** CLS 방지용  Intrinsic 비율 힌트 */
  width: number
  height: number
  objectPosition: string
}

/** 메인 비대칭 블록 (좌 외관 / 우 실내) */
export const DESIGN_FEATURE_BLOCKS: DesignFeatureBlock[] = [
  {
    id: 'exterior',
    category: 'EXTERIOR',
    title: '조각된 면과 선',
    description: '휠 아치와 측면의 면 구성이 만드는 절제된 실루엣.',
    mainSrc: `${ASSET}/ev3_07.webp`,
    mainAlt: '기아 EV3 전측면 익스테리어 디테일',
    width: 1600,
    height: 1200,
    objectPosition: '40% 55%',
  },
  {
    id: 'interior',
    category: 'INTERIOR',
    title: '정돈된 디지털 콕핏',
    description: '와이드 디스플레이와 열린 콘솔이 만드는 일상 공간.',
    mainSrc: `${ASSET}/ev3_09.webp`,
    mainAlt: '기아 EV3 앞좌석 인테리어',
    width: 1600,
    height: 1067,
    objectPosition: '50% 45%',
  },
]

/** 카테고리별 상세 갤러리 (메인 클릭 시 Swiper) */
export const GALLERY_SLIDES: GallerySlide[] = [
  {
    id: 'ext-07',
    category: 'exterior',
    src: `${ASSET}/ev3_07.webp`,
    alt: '기아 EV3 전측면 휠·도어 디테일',
    caption: '전측면의 면과 휠 아치',
  },
  {
    id: 'ext-01',
    category: 'exterior',
    src: `${ASSET}/ev3_01.webp`,
    alt: '기아 EV3 익스테리어 뷰 01',
    caption: '익스테리어 뷰',
  },
  {
    id: 'ext-02',
    category: 'exterior',
    src: `${ASSET}/ev3_02.webp`,
    alt: '기아 EV3 익스테리어 뷰 02',
    caption: '실루엣과 프로파일',
  },
  {
    id: 'ext-03',
    category: 'exterior',
    src: `${ASSET}/ev3_03_11.webp`,
    alt: '기아 EV3 익스테리어 뷰 03',
    caption: '디테일 클로즈업',
  },
  {
    id: 'int-09',
    category: 'interior',
    src: `${ASSET}/ev3_09.webp`,
    alt: '기아 EV3 앞좌석 인테리어',
    caption: '디지털 콕핏과 콘솔',
  },
  {
    id: 'int-10',
    category: 'interior',
    src: `${ASSET}/ev3_10.webp`,
    alt: '기아 EV3 인테리어 뷰 02',
    caption: '실내 공간',
  },
  {
    id: 'int-11',
    category: 'interior',
    src: `${ASSET}/ev3_11.webp`,
    alt: '기아 EV3 인테리어 뷰 03',
    caption: '시트의 질감과 구성',
  },
]

export function getGalleryByCategory(category: GallerySlide['category']): GallerySlide[] {
  return GALLERY_SLIDES.filter((slide) => slide.category === category)
}
