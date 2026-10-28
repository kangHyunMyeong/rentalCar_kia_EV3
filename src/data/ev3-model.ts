import type { EV3Model } from '@/types'
import { EV3_IMAGE_PATHS } from './images'

export const EV3_MODEL: EV3Model = {
  id: 'kia-ev3',
  name: 'EV3',
  brand: 'Kia',
  series: 'EV',
  description:
    '컴팩트 SUV 형태의 기아 전기차 EV3. 일상 주행에 맞춘 공간과 전동화 경험을 중심으로 장기렌트 견적을 구성할 수 있습니다.',
  imagePaths: EV3_IMAGE_PATHS,
}
