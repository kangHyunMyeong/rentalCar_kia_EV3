/**
 * STEP 5-2 Lighthouse: mobile×5, desktop×3, medians
 */
import fs from 'fs'
import { spawn } from 'child_process'
import path from 'path'

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://127.0.0.1:4173/'
const OUT = 'perf-reports/lcp52'
const LH = 'lighthouse@12.8.2'
fs.mkdirSync(OUT, { recursive: true })

function median(nums) {
  const a = [...nums].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

function runShell(commandLine) {
  return new Promise((resolve, reject) => {
    const p = spawn(commandLine, { shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => {
      if (code !== 0) reject(new Error(err || `exit ${code}`))
      else resolve()
    })
  })
}

function q(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`
}

async function once(form, i) {
  const file = path.join(OUT, `lh-${form}-${i}.json`)
  const formArgs =
    form === 'mobile'
      ? '--form-factor=mobile --screenEmulation.mobile'
      : '--preset=desktop'
  const cmd = [
    'npx',
    '--yes',
    LH,
    q(BASE),
    '--only-categories=performance',
    '--throttling-method=simulate',
    '--output=json',
    `--output-path=${q(file)}`,
    `--chrome-path=${q(CHROME)}`,
    '--chrome-flags=--headless=new --no-sandbox',
    '--quiet',
    formArgs,
  ].join(' ')
  process.stdout.write(`  ${form} #${i}...\n`)
  await runShell(cmd)
  const j = JSON.parse(fs.readFileSync(file, 'utf8'))
  const a = j.audits
  let phases = null
  for (const block of a['largest-contentful-paint-element']?.details?.items || []) {
    if (block.items?.[0]?.phase) {
      phases = Object.fromEntries(
        block.items.map((it) => [it.phase, { ms: Math.round(it.timing), pct: it.percent }]),
      )
    }
  }
  const reqs = a['network-requests']?.details?.items || []
  const kv = reqs.find((r) => String(r.url).includes('kv-bg'))
  return {
    score: Math.round(j.categories.performance.score * 100),
    FCP: Math.round(a['first-contentful-paint'].numericValue),
    LCP: Math.round(a['largest-contentful-paint'].numericValue),
    CLS: +a['cumulative-layout-shift'].numericValue.toFixed(3),
    TBT: Math.round(a['total-blocking-time'].numericValue),
    SI: Math.round(a['speed-index'].numericValue),
    transferKB: +(a['total-byte-weight'].numericValue / 1024).toFixed(1),
    networkReqs: reqs.length,
    phases,
    kvTransferKB: kv ? +(kv.transferSize / 1024).toFixed(1) : null,
    kvMimeHint: kv?.mimeType ?? null,
  }
}

const summary = { coldCacheNote: 'Lighthouse cleans origin/cache each run (cold-ish lab)', forms: {} }
for (const [form, n] of [
  ['mobile', 5],
  ['desktop', 3],
]) {
  const runs = []
  for (let i = 1; i <= n; i++) runs.push(await once(form, i))
  summary.forms[form] = {
    runs,
    median: {
      score: median(runs.map((r) => r.score)),
      FCP: median(runs.map((r) => r.FCP)),
      LCP: median(runs.map((r) => r.LCP)),
      CLS: median(runs.map((r) => r.CLS)),
      TBT: median(runs.map((r) => r.TBT)),
      SI: median(runs.map((r) => r.SI)),
      transferKB: median(runs.map((r) => r.transferKB)),
      networkReqs: median(runs.map((r) => r.networkReqs)),
      kvTransferKB: median(runs.map((r) => r.kvTransferKB).filter((x) => x != null)),
    },
    phasesMid: runs[Math.floor(runs.length / 2)].phases,
  }
}

fs.writeFileSync(path.join(OUT, 'lh-summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary.forms, null, 2))
