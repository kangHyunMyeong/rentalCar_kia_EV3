/**
 * STEP 5-3: Detailed mobile LCP timeline (Slow 4G + CPU 4×)
 */
import fs from 'fs'
import puppeteer from 'puppeteer-core'

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL = process.argv[2] || 'http://127.0.0.1:4173/'
const OUT = process.argv[3] || 'perf-reports/lcp53/timeline.json'

fs.mkdirSync('perf-reports/lcp53', { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})

try {
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true })
  const client = await page.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: 'cellular4g',
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.evaluateOnNewDocument(() => {
    window.__t = {
      marks: [],
      longtasks: [],
      lcp: null,
      paints: [],
      imgEvents: [],
    }
    const mark = (name, extra) => {
      window.__t.marks.push({ name, t: performance.now(), ...extra })
    }
    mark('script_evaluate_on_new_document')

    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__t.lcp = {
          startTime: e.startTime,
          size: e.size,
          url: e.url,
          el: e.element
            ? `${e.element.tagName}.${String(e.element.className || '').trim()}`
            : null,
        }
        mark('lcp_entry', { startTime: e.startTime, url: e.url })
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__t.paints.push({ name: e.name, startTime: e.startTime })
        mark(e.name, { startTime: e.startTime })
      }
    }).observe({ type: 'paint', buffered: true })

    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__t.longtasks.push({
            startTime: e.startTime,
            duration: e.duration,
            attribution: e.attribution
              ? [...e.attribution].map((a) => ({
                  name: a.name,
                  containerType: a.containerType,
                  containerSrc: a.containerSrc,
                }))
              : [],
          })
        }
      }).observe({ type: 'longtask', buffered: true })
    } catch (_) {}

    const watchImg = () => {
      const img = document.querySelector('img.kv-bg-img')
      if (!img || img.__watched) return
      img.__watched = true
      mark('kv_bg_dom_found', {
        complete: img.complete,
        nw: img.naturalWidth,
      })
      if (img.complete && img.naturalWidth > 0) {
        mark('kv_bg_already_complete')
      }
      img.addEventListener(
        'load',
        () => mark('kv_bg_load_event', { nw: img.naturalWidth, nh: img.naturalHeight }),
        { once: true },
      )
      try {
        img.decode().then(
          () => mark('kv_bg_decode_resolved'),
          (err) => mark('kv_bg_decode_rejected', { err: String(err) }),
        )
      } catch (_) {}
    }

    const mo = new MutationObserver(() => watchImg())
    const startMo = () => {
      if (document.documentElement) {
        mo.observe(document.documentElement, { childList: true, subtree: true })
        watchImg()
      }
    }
    if (document.documentElement) startMo()
    else document.addEventListener('DOMContentLoaded', startMo)

    const _append = Element.prototype.appendChild
    Element.prototype.appendChild = function (child) {
      const r = _append.call(this, child)
      if (child && child.id === 'root') mark('root_node_present')
      return r
    }
  })

  const net = []
  client.on('Network.responseReceived', (e) => {
    const u = e.response.url
    if (
      u.includes('127.0.0.1:4173') &&
      (u.endsWith('/') ||
        u.includes('.js') ||
        u.includes('.css') ||
        u.includes('kv-bg') ||
        u.includes('kv-car') ||
        u.includes('woff2'))
    ) {
      net.push({
        url: u.replace('http://127.0.0.1:4173', ''),
        status: e.response.status,
        mime: e.response.mimeType,
        t: Date.now(),
      })
    }
  })
  client.on('Network.loadingFinished', () => {})

  const wall0 = Date.now()
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 })
  await new Promise((r) => setTimeout(r, 2500))

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource').map((r) => ({
      name: r.name.replace(location.origin, ''),
      initiatorType: r.initiatorType,
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize,
      startTime: r.startTime,
      requestStart: r.requestStart,
      responseEnd: r.responseEnd,
      duration: r.duration,
      renderBlockingStatus: r.renderBlockingStatus,
    }))
    const scripts = resources.filter((r) => r.name.includes('.js'))
    const css = resources.filter((r) => r.name.includes('.css'))
    const kv = resources.find((r) => r.name.includes('kv-bg'))
    const font = resources.find((r) => r.name.includes('woff2'))
    return {
      marks: window.__t.marks,
      longtasks: window.__t.longtasks,
      lcp: window.__t.lcp,
      paints: window.__t.paints,
      nav: nav
        ? {
            responseStart: nav.responseStart,
            domInteractive: nav.domInteractive,
            domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
            loadEventEnd: nav.loadEventEnd,
            transferSize: nav.transferSize,
          }
        : null,
      kv,
      scripts,
      css,
      font,
      resources,
      reactRootChildren: document.getElementById('root')?.childElementCount ?? 0,
      hasHeroImg: !!document.querySelector('img.kv-bg-img'),
    }
  })

  const ttfb = data.nav?.responseStart
  const lcpT = data.lcp?.startTime
  const kv = data.kv
  const phases =
    lcpT != null && ttfb != null && kv
      ? {
          TTFB_ms: Math.round(ttfb),
          loadDelay_ms: Math.round(Math.max(0, kv.requestStart - ttfb)),
          loadDuration_ms: Math.round(Math.max(0, kv.responseEnd - kv.requestStart)),
          renderDelay_ms: Math.round(Math.max(0, lcpT - kv.responseEnd)),
          lcp_ms: Math.round(lcpT),
        }
      : null

  const longTaskTotal = (data.longtasks || []).reduce((s, t) => s + t.duration, 0)
  const out = {
    url: URL,
    wallMs: Date.now() - wall0,
    phases,
    longTaskCount: data.longtasks.length,
    longTaskTotalMs: Math.round(longTaskTotal),
    longtasks: data.longtasks,
    timeline: data.marks.sort((a, b) => a.t - b.t),
    nav: data.nav,
    kv: data.kv,
    scripts: data.scripts,
    css: data.css,
    font: data.font,
    paints: data.paints,
    lcp: data.lcp,
    netLogCount: net.length,
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(
    JSON.stringify(
      {
        out: OUT,
        phases,
        longTaskTotalMs: out.longTaskTotalMs,
        longTaskCount: out.longTaskCount,
        lcp: data.lcp,
        kvResponseEnd: kv?.responseEnd,
        scriptCount: data.scripts.length,
        mainScript: data.scripts.find((s) => s.name.includes('index-')),
        marks: data.marks.map((m) => `${Math.round(m.t)}:${m.name}`),
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
