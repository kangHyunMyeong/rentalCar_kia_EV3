/**
 * STEP 5-1: KV 배경 최적화 후보 생성 (원본 덮어쓰기 금지)
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const SRC = 'public/assets/ev3/kv-bg.webp'
const OUT = 'public/assets/ev3/lcp-candidates'

fs.mkdirSync(OUT, { recursive: true })

const srcStat = fs.statSync(SRC)
const meta = await sharp(SRC).metadata()
console.log('source', { size: srcStat.size, ...meta })

const pipeline = () => sharp(SRC).rotate()

async function write(name, transform) {
  const outPath = path.join(OUT, name)
  await transform.toFile(outPath)
  const st = fs.statSync(outPath)
  const m = await sharp(outPath).metadata()
  const row = {
    name,
    width: m.width,
    height: m.height,
    format: m.format,
    bytes: st.size,
    kb: +(st.size / 1024).toFixed(1),
    vsOrigPct: +((1 - st.size / srcStat.size) * 100).toFixed(1),
  }
  console.log(JSON.stringify(row))
  return row
}

const results = []

// A1: true WebP q=82 (same resolution)
results.push(
  await write('A-webp-q82.webp', pipeline().webp({ quality: 82, effort: 6 })),
)
// A2: WebP q=72
results.push(
  await write('A-webp-q72.webp', pipeline().webp({ quality: 72, effort: 6 })),
)
// A3: WebP q=88 (safer quality)
results.push(
  await write('A-webp-q88.webp', pipeline().webp({ quality: 88, effort: 6 })),
)

// B1: max width 1280, webp q82
results.push(
  await write(
    'B-w1280-q82.webp',
    pipeline().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }),
  ),
)
// B2: max width 960 (mobile-ish full-bleed), webp q80
results.push(
  await write(
    'B-w960-q80.webp',
    pipeline().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }),
  ),
)
// B3: max width 1120, webp q85
results.push(
  await write(
    'B-w1120-q85.webp',
    pipeline().resize({ width: 1120, withoutEnlargement: true }).webp({ quality: 85, effort: 6 }),
  ),
)

// C: AVIF candidates
results.push(
  await write('C-avif-q55.avif', pipeline().avif({ quality: 55, effort: 6 })),
)
results.push(
  await write(
    'C-avif-w1280-q50.avif',
    pipeline().resize({ width: 1280, withoutEnlargement: true }).avif({ quality: 50, effort: 6 }),
  ),
)
results.push(
  await write(
    'C-avif-w960-q48.avif',
    pipeline().resize({ width: 960, withoutEnlargement: true }).avif({ quality: 48, effort: 6 }),
  ),
)

// Mobile dedicated: 828w (2x ~414) and 960w
results.push(
  await write(
    'M-w828-q80.webp',
    pipeline().resize({ width: 828, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }),
  ),
)

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ source: { path: SRC, bytes: srcStat.size, meta }, results }, null, 2))
console.log('wrote', path.join(OUT, 'manifest.json'))
