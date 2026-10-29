/**
 * STEP 5-2: MIME / preload / duplicate / screenshots / puppeteer LCP phases
 */
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:4173'
const OUT = 'perf-reports/lcp52'
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true })

const viewports = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080, isMobile: false, dpr: 1 },
  { name: 'laptop-1440x900', width: 1440, height: 900, isMobile: false, dpr: 1 },
  { name: 'tablet-768x1024', width: 768, height: 1024, isMobile: true, dpr: 2 },
  { name: 'mobile-390x844', width: 390, height: 844, isMobile: true, dpr: 3 },
  { name: 'mobile-375x812', width: 375, height: 812, isMobile: true, dpr: 3 },
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})

const networkFindings = []

try {
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true })

  const client = await page.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })

  const kvReqs = []
  client.on('Network.responseReceived', (e) => {
    const url = e.response.url
    if (url.includes('kv-bg')) {
      kvReqs.push({
        url,
        status: e.response.status,
        mimeType: e.response.mimeType,
        fromDiskCache: e.response.fromDiskCache,
        fromServiceWorker: e.response.fromServiceWorker,
      })
    }
  })

  await page.evaluateOnNewDocument(() => {
    window.__lcp52 = { lcp: null, longtasks: [] }
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__lcp52.lcp = {
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
          window.__lcp52.longtasks.push({ startTime: e.startTime, duration: e.duration })
        }
      }).observe({ type: 'longtask', buffered: true })
    } catch (_) {}
  })

  // Slow 4G + 4x CPU for phase trace
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: 'cellular4g',
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 120000 })
  await new Promise((r) => setTimeout(r, 2000))

  const pageState = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const bgRes = resources.filter((r) => r.name.includes('kv-bg'))
    const img = document.querySelector('img.kv-bg-img')
    const preload = [...document.querySelectorAll('link[rel="preload"][as="image"]')].map((l) => ({
      href: l.getAttribute('href'),
      type: l.getAttribute('type'),
      media: l.getAttribute('media'),
      fetchPriority: l.getAttribute('fetchpriority') || l.fetchPriority,
    }))
    const cs = img ? getComputedStyle(img) : null
    return {
      title: document.title,
      hasJsonLd: !!document.querySelector('script[type="application/ld+json"]'),
      preload,
      bgRes: bgRes.map((r) => ({
        name: r.name,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        decodedBodySize: r.decodedBodySize,
        initiatorType: r.initiatorType,
        requestStart: r.requestStart,
        responseEnd: r.responseEnd,
        duration: r.duration,
      })),
      img: img
        ? {
            src: img.currentSrc || img.src,
            loading: img.loading,
            decoding: img.decoding,
            fetchPriority: img.fetchPriority,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            opacity: cs.opacity,
            objectFit: cs.objectFit,
          }
        : null,
      lcp: window.__lcp52.lcp,
      longtasks: window.__lcp52.longtasks,
      nav: nav
        ? { responseStart: nav.responseStart, domInteractive: nav.domInteractive }
        : null,
    }
  })

  const ttfb = pageState.nav?.responseStart
  const lcpT = pageState.lcp?.startTime
  const bg = pageState.bgRes?.[0]
  const phases =
    lcpT != null && ttfb != null && bg
      ? {
          TTFB_ms: Math.round(ttfb),
          loadDelay_ms: Math.round(Math.max(0, bg.requestStart - ttfb)),
          loadDuration_ms: Math.round(Math.max(0, bg.responseEnd - bg.requestStart)),
          renderDelay_ms: Math.round(Math.max(0, lcpT - bg.responseEnd)),
          lcp_ms: Math.round(lcpT),
        }
      : null

  networkFindings.push({ kvReqs, pageState, phases })

  // Screenshots without heavy throttle (clear network emulation for visuals)
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })

  for (const vp of viewports) {
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dpr,
      isMobile: vp.isMobile,
    })
    await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 })
    await new Promise((r) => setTimeout(r, 800))
    const shot = path.join(OUT, 'screenshots', `${vp.name}.png`)
    await page.screenshot({ path: shot, fullPage: false })
    console.log('shot', shot)
  }

  const summary = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    kvResponses: kvReqs,
    uniqueKvUrls: [...new Set(kvReqs.map((r) => r.url))],
    responseCount: kvReqs.length,
    phases,
    pageState: {
      title: pageState.title,
      hasJsonLd: pageState.hasJsonLd,
      preload: pageState.preload,
      img: pageState.img,
      bgRes: pageState.bgRes,
      lcp: pageState.lcp,
      longTaskTotalMs: Math.round(
        (pageState.longtasks || []).reduce((s, t) => s + t.duration, 0),
      ),
    },
  }
  fs.writeFileSync(path.join(OUT, 'verify-summary.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser.close()
}
