/**
 * STEP 5-1 measurement suite (Lighthouse mobile/desktop × 3, median)
 * Requires: npm run build already done with TEMP lcp51 query support, preview on 4173
 */
import fs from 'fs'
import { spawn } from 'child_process'
import path from 'path'

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://127.0.0.1:4173'
const OUT_DIR = 'perf-reports/lcp51'
const LH = 'lighthouse@12.8.2'

fs.mkdirSync(OUT_DIR, { recursive: true })

function median(nums) {
  const a = [...nums].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

function runShell(commandLine) {
  return new Promise((resolve, reject) => {
    const p = spawn(commandLine, { shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => {
      if (code !== 0) reject(new Error(err || out || `exit ${code}`))
      else resolve(out)
    })
  })
}

function q(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`
}

async function lighthouseOnce(url, form, outFile) {
  const formArgs =
    form === 'mobile'
      ? '--form-factor=mobile --screenEmulation.mobile'
      : '--preset=desktop'
  const cmd = [
    'npx',
    '--yes',
    LH,
    q(url),
    '--only-categories=performance',
    '--throttling-method=simulate',
    '--output=json',
    `--output-path=${q(outFile)}`,
    `--chrome-path=${q(CHROME)}`,
    '--chrome-flags=--headless=new --no-sandbox',
    '--quiet',
    formArgs,
  ].join(' ')
  await runShell(cmd)
  const j = JSON.parse(fs.readFileSync(outFile, 'utf8'))
  const a = j.audits
  const lcpEl = a['largest-contentful-paint-element']
  let phases = null
  if (lcpEl?.details?.items) {
    for (const block of lcpEl.details.items) {
      if (block.items?.[0]?.phase) {
        phases = Object.fromEntries(
          block.items.map((i) => [i.phase, { ms: Math.round(i.timing), pct: i.percent }]),
        )
      }
    }
  }
  return {
    score: Math.round(j.categories.performance.score * 100),
    FCP: Math.round(a['first-contentful-paint'].numericValue),
    LCP: Math.round(a['largest-contentful-paint'].numericValue),
    CLS: +a['cumulative-layout-shift'].numericValue.toFixed(3),
    TBT: Math.round(a['total-blocking-time'].numericValue),
    transferKB: +(a['total-byte-weight'].numericValue / 1024).toFixed(1),
    phases,
    lcpSnippet: lcpEl?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? null,
  }
}

async function measureLabel(label, urlPath, forms = ['mobile', 'desktop']) {
  const result = { label, url: BASE + urlPath, forms: {} }
  for (const form of forms) {
    const runs = []
    for (let i = 1; i <= 3; i++) {
      const file = path.join(OUT_DIR, `${label.replace(/[^a-zA-Z0-9_-]/g, '_')}-${form}-${i}.json`)
      process.stdout.write(`  ${label} ${form} #${i}...\n`)
      const r = await lighthouseOnce(`${BASE}${urlPath}`, form, file)
      runs.push(r)
      fs.writeFileSync(file.replace('.json', '.summary.json'), JSON.stringify(r, null, 2))
    }
    result.forms[form] = {
      runs,
      median: {
        score: median(runs.map((r) => r.score)),
        FCP: median(runs.map((r) => r.FCP)),
        LCP: median(runs.map((r) => r.LCP)),
        CLS: median(runs.map((r) => r.CLS)),
        TBT: median(runs.map((r) => r.TBT)),
        transferKB: median(runs.map((r) => r.transferKB)),
      },
      phasesMedianRun: runs[1].phases, // middle run phases for reference
    }
  }
  return result
}

const scenarios = [
  { label: 'A-anim-on', path: '/?lcp51=1', forms: ['mobile'] },
  { label: 'B-anim-off', path: '/?lcp51=1&kvAnim=off', forms: ['mobile'] },
  { label: 'C-instant', path: '/?lcp51=1&kvAnim=off&kvInstant=1', forms: ['mobile'] },
  { label: 'img-baseline-png', path: '/?lcp51=1', forms: ['mobile', 'desktop'] },
  { label: 'img-A-q88', path: '/?lcp51=1&kvBg=/assets/ev3/lcp-candidates/A-webp-q88.webp', forms: ['mobile', 'desktop'] },
  { label: 'img-A-q82', path: '/?lcp51=1&kvBg=/assets/ev3/lcp-candidates/A-webp-q82.webp', forms: ['mobile', 'desktop'] },
  { label: 'img-B-1280', path: '/?lcp51=1&kvBg=/assets/ev3/lcp-candidates/B-w1280-q82.webp', forms: ['mobile', 'desktop'] },
  { label: 'img-M-828', path: '/?lcp51=1&kvBg=/assets/ev3/lcp-candidates/M-w828-q80.webp', forms: ['mobile'] },
  { label: 'img-C-avif55', path: '/?lcp51=1&kvBg=/assets/ev3/lcp-candidates/C-avif-q55.avif', forms: ['mobile'] },
]

const all = []
for (const s of scenarios) {
  all.push(await measureLabel(s.label, s.path, s.forms))
}

fs.writeFileSync(path.join(OUT_DIR, 'suite-summary.json'), JSON.stringify(all, null, 2))
console.log('\n==== MEDIANS ====')
for (const row of all) {
  for (const [form, data] of Object.entries(row.forms)) {
    const m = data.median
    console.log(
      `${row.label.padEnd(18)} ${form.padEnd(8)} LCP=${m.LCP} FCP=${m.FCP} CLS=${m.CLS} TBT=${m.TBT} score=${m.score} KB=${m.transferKB}`,
    )
  }
}
