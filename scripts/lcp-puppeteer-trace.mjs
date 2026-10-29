/**
 * Puppeteer CDP-ish metrics: LCP phases under mobile throttle
 */
import fs from 'fs'
import puppeteer from 'puppeteer-core'

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL = process.argv[2] || 'http://127.0.0.1:4173/?lcp51=1'
const OUT = process.argv[3] || 'perf-reports/lcp51/puppeteer-baseline.json'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true })
  // Slow 4G + 4x CPU
  const client = await page.createCDPSession()
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: 'cellular4g',
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.evaluateOnNewDocument(() => {
    window.__lcp51 = { lcp: null, longtasks: [] }
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__lcp51.lcp = {
          startTime: e.startTime,
          size: e.size,
          url: e.url,
          element: e.element
            ? `${e.element.tagName}.${String(e.element.className || '').trim()}`
            : null,
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__lcp51.longtasks.push({ startTime: e.startTime, duration: e.duration })
        }
      }).observe({ type: 'longtask', buffered: true })
    } catch (_) {}
  })

  const started = Date.now()
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 })
  await new Promise((r) => setTimeout(r, 2500))

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const lcpUrl = window.__lcp51?.lcp?.url
    const bg =
      resources.find((r) => lcpUrl && r.name === lcpUrl) ||
      resources.find((r) => /kv-bg|lcp-candidates/.test(r.name))
    const img = document.querySelector('img.kv-bg-img')
    const cs = img ? getComputedStyle(img) : null
    return {
      lcp: window.__lcp51.lcp,
      longtasks: window.__lcp51.longtasks,
      nav: nav
        ? {
            responseStart: nav.responseStart,
            domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
            loadEventEnd: nav.loadEventEnd,
            domInteractive: nav.domInteractive,
          }
        : null,
      bg: bg
        ? {
            name: bg.name,
            transferSize: bg.transferSize,
            encodedBodySize: bg.encodedBodySize,
            decodedBodySize: bg.decodedBodySize,
            startTime: bg.startTime,
            requestStart: bg.requestStart,
            responseEnd: bg.responseEnd,
            duration: bg.duration,
          }
        : null,
      img: img
        ? {
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            currentSrc: img.currentSrc,
            opacity: cs.opacity,
            visibility: cs.visibility,
            fetchPriority: img.fetchPriority,
            decoding: img.decoding,
          }
        : null,
      gsapActive: !!document.querySelector('.kv-lettering[style*="opacity"]'),
    }
  })

  const ttfb = data.nav?.responseStart ?? null
  const lcpT = data.lcp?.startTime ?? null
  const reqStart = data.bg?.requestStart ?? null
  const resEnd = data.bg?.responseEnd ?? null
  const phases =
    lcpT != null && ttfb != null && reqStart != null && resEnd != null
      ? {
          TTFB_ms: Math.round(ttfb),
          loadDelay_ms: Math.round(Math.max(0, reqStart - ttfb)),
          loadDuration_ms: Math.round(Math.max(0, resEnd - reqStart)),
          renderDelay_ms: Math.round(Math.max(0, lcpT - resEnd)),
          lcp_ms: Math.round(lcpT),
        }
      : null

  const longTaskMs = (data.longtasks || []).reduce((s, t) => s + t.duration, 0)
  const out = {
    url: URL,
    wallMs: Date.now() - started,
    phases,
    longTaskCount: data.longtasks?.length ?? 0,
    longTaskTotalMs: Math.round(longTaskMs),
    data,
  }
  fs.mkdirSync('perf-reports/lcp51', { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(JSON.stringify({ out: OUT, phases, encoded: data.bg?.encodedBodySize, longTaskTotalMs: out.longTaskTotalMs, lcpEl: data.lcp?.element }, null, 2))
} finally {
  await browser.close()
}
