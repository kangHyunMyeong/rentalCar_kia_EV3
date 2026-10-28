# 기아 EV3 장기렌트 랜딩페이지

Sculpted Silver 콘셉트의 React + TypeScript 반응형 랜딩입니다.  
견적 선택 → 상담 신청 흐름을 중심으로 구성했으며, 요율/상담 API는 교체 가능한 서비스 계층으로 분리되어 있습니다.

## 설치 · 실행

```bash
npm install
npm run dev
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run test` | Vitest 주요 흐름 테스트 |
| `npm run lint` | oxlint |

## 디자인 토큰 (Sculpted Silver)

- Silver Mist `#ECEFEE`
- Sculpted Gray `#C9D0D0`
- Deep Teal `#103A3A`
- Soft Mint `#B7DBD2`

토큰 정의: `src/styles/tokens.css`, Tailwind `@theme`: `src/styles/index.css`

## 페이지 섹션

1. KV / Header  
2. Why EV3  
3. Design & Interior  
4. Color Studio  
5. Rental Estimate  
6. FAQ & Closing Consultation CTA  
7. Footer (핏카컴퍼니 사업자 정보)  

Quick Estimate·Trim Comparison·라이프스타일·이용 절차 섹션은 현재 포함하지 않습니다.

## 에셋 교체 위치

이미지를 아래 경로에 **같은 파일명**으로 넣으면 컴포넌트/CSS 수정 없이 반영됩니다.

```
public/assets/ev3/kv-car.webp
public/assets/ev3/kv-car-mobile.webp
public/assets/ev3/kv-bg.webp
public/assets/ev3/trim-air.webp
public/assets/ev3/trim-earth.webp
public/assets/ev3/trim-gt-line.webp
public/assets/ev3/gallery-exterior-01.webp
public/assets/ev3/gallery-exterior-02.webp
public/assets/ev3/gallery-exterior-03.webp
public/assets/ev3/gallery-interior-01.webp
public/assets/ev3/gallery-interior-02.webp
public/assets/ev3/gallery-interior-03.webp
public/og/og-ev3.jpg
```

경로 상수: `src/data/images.ts`  
- 배경 제거(cutout) / 스튜디오(studio) 모드는 `VehicleImage`의 `mode` prop으로 지원합니다.  
- 파일이 없어도 fallback UI로 레이아웃이 유지됩니다.  
- 외부 네이버 CDN에 의존하지 않습니다.

## 견적 · 가격 정책 (중요)

- 기본(`simulation`): 개발용 가정값으로 **참고용** 월 예상 렌트료를 표시합니다. 실제 계약 요율이 아닙니다.
- `api` / `verified`: 검증된 요율만 사용. 미연결 시 simulation 가정값을 쓰지 않습니다.

```bash
# .env
VITE_PRICING_MODE=simulation
```

요율 API 연결 시 `src/services/pricing/` Provider를 교체하면 됩니다.

## 상담 신청

- Rental Estimate의 모달에서 신청 (React Hook Form + Zod)
- 필수 개인정보 동의 / 선택 마케팅 동의 분리
- 개인정보 **localStorage 미저장**
- API 미연결 시 **시연 모드** 안내 (실제 접수 완료로 표시하지 않음)
- Lead 서비스: `src/services/lead/`

## 프로젝트 구조

```
src/
  components/   layout, hero, features, gallery, color-studio, quote, ui
  data/         컬러·트림·조건·차량가·시뮬레이션 가정값·이미지 경로
  types/        EV3Model, RentalTrim, QuoteSelection, LeadRequest 등
  stores/       Zustand (컬러·기본 견적 조건)
  services/     pricing / lead / vehicle API 계층
  hooks/
  styles/
```

## API 연동 포인트 (미연결)

| 기능 | 현재 | 교체 위치 |
| --- | --- | --- |
| 차량·트림 조회 | 로컬 `data/` | `services/vehicle.ts` |
| 렌트 요율·견적 계산 | simulation 가정값 | `services/pricing/` |
| 상담 신청 | DemoLeadService | `services/lead/` |
| 가격표 버전 | null | `PricingVersion` + Provider |

관리자 페이지는 포함하지 않았습니다.

## 접근성 · 성능

- 시맨틱 헤딩, skip link, focus-visible
- 모바일 메뉴 포커스/Escape 닫기
- `prefers-reduced-motion` 시 GSAP·스크롤 모션 축소
- Hero 이미지 eager, 하단 lazy
- 한국어 title / meta / OG 경로 분리
