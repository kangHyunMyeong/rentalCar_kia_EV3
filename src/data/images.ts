import type { VehicleImageSet } from '@/types'

/**
 * 이미지 경로 단일 관리.
 * 파일을 public/assets/ev3/ 아래에 같은 이름으로 교체하면
 * 컴포넌트/CSS 수정 없이 반영됩니다.
 */
export const EV3_IMAGE_PATHS: VehicleImageSet = {
  kvCar: '/assets/ev3/kv-car.webp',
  kvCarMobile: '/assets/ev3/kv-car-mobile.webp',
  kvBg: '/assets/ev3/kv-bg.webp',
  trimAir: '/assets/ev3/trim-air.webp',
  trimEarth: '/assets/ev3/trim-earth.webp',
  trimGtLine: '/assets/ev3/trim-gt-line.webp',
  exterior: [
    '/assets/ev3/ev3_07.webp',
    '/assets/ev3/ev3_01.webp',
    '/assets/ev3/ev3_02.webp',
    '/assets/ev3/ev3_03_11.webp',
  ],
  interior: [
    '/assets/ev3/ev3_09.webp',
    '/assets/ev3/ev3_10.webp',
    '/assets/ev3/ev3_11.webp',
  ],
}

/** 배경 제거(투명) 차량 / 배경 포함 차량 모두 지원 */
export type CarImageMode = 'cutout' | 'studio'

export const DEFAULT_CAR_IMAGE_MODE: CarImageMode = 'cutout'
