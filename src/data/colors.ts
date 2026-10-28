import type { ExteriorColor, ExteriorColorId } from '@/types'

const ASSET = '/assets/ev3'

/**
 * EV3 외장 컬러.
 * 이미지: 1600×900 / WebP / 투명 배경 / 동일 각도·크기
 */
export const EXTERIOR_COLORS: ExteriorColor[] = [
  {
    id: 'ISM',
    code: 'ISM',
    name: '아이보리 매트 실버',
    nameEn: 'Ivory Matte Silver',
    swatch: '#D8D4C8',
    swatchBorder: 'rgba(16,58,58,0.18)',
    imageSrc: `${ASSET}/ivory_matSilver.webp`,
  },
  {
    id: 'ISG',
    code: 'ISG',
    name: '아이보리 실버',
    nameEn: 'Ivory Silver',
    swatch: '#E8E4DC',
    swatchBorder: 'rgba(16,58,58,0.18)',
    imageSrc: `${ASSET}/ivory_silver.webp`,
  },
  {
    id: 'SWP',
    code: 'SWP',
    name: '스노우 화이트 펄',
    nameEn: 'Snow White Pearl',
    swatch: '#F5F5F5',
    swatchBorder: 'rgba(16,58,58,0.2)',
    imageSrc: `${ASSET}/white_pearl.webp`,
  },
  {
    id: 'AG3',
    code: 'AG3',
    name: '어드벤처 그린',
    nameEn: 'Adventure Green',
    swatch: '#5A6B4A',
    imageSrc: `${ASSET}/green.webp`,
  },
  {
    id: 'EBB',
    code: 'EBB',
    name: '프로스트 블루',
    nameEn: 'Frost Blue',
    swatch: '#7A9BB0',
    imageSrc: `${ASSET}/prost_blue.webp`,
  },
  {
    id: 'EBD',
    code: 'EBD',
    name: '셰일 그레이',
    nameEn: 'Shale Gray',
    swatch: '#6E7276',
    imageSrc: `${ASSET}/gray.webp`,
  },
  {
    id: 'ABP',
    code: 'ABP',
    name: '오로라 블랙 펄',
    nameEn: 'Aurora Black Pearl',
    swatch: '#1A1C1E',
    imageSrc: `${ASSET}/black_pearl.webp`,
  },
]

export const DEFAULT_EXTERIOR_COLOR_ID: ExteriorColorId = 'ISM'

export const COLOR_STUDIO = {
  index: '04',
  eyebrow: 'COLOR STUDIO',
  title: '나에게 맞는 EV3 컬러를 고르세요.',
  description: '동일한 각도의 실차 이미지로 외장 컬러를 비교할 수 있습니다.',
} as const

export function getExteriorColorById(id: ExteriorColorId): ExteriorColor {
  return EXTERIOR_COLORS.find((c) => c.id === id) ?? EXTERIOR_COLORS[0]
}

export function preloadColorImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to preload ${src}`))
    img.src = src
  })
}
