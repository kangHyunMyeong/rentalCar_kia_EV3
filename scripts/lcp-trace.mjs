/**
 * STEP 5-1: Chrome CDP Performance Trace — LCP phase breakdown + long tasks
 * Usage: node scripts/lcp-trace.mjs <url> [out.json]
 */
import fs from 'fs'
import { spawn } from 'child_process'
import http from 'http'

const URL = process.argv[2] || 'http://127.0.0.1:4173/'
const OUT = process.argv[3] || 'perf-reports/lcp51/trace-default.json'
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9229

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitPort(port, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
          res.resume()
          resolve()
        })
        req.on('error', reject)
      })
      return
    } catch {
      await sleep(200)
    }
  }
  throw new Error('Chrome CDP not ready')
}

async function cdp(wsUrl, method, params = {}) {
  const { default: WebSocket } = await import('ws')
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    const events = []
    ws.on('open', () => {
      const send = (m, p) =>
        new Promise((res, rej) => {
          const mid = ++id
          pending.set(mid, { res, rej })
          ws.send(JSON.stringify({ id: mid, method: m, params: p }))
        })
      resolve({ send, events, close: () => ws.close(), raw: ws })
    })
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) rej(msg.error)
        else res(msg.result)
      } else if (msg.method) {
        events.push(msg)
      }
    })
    ws.on('error', reject)
  })
}

async function main() {
  fs.mkdirSync('perf-reports/lcp51', { recursive: true })
  const userData = fs.mkdtempSync('perf-reports/lcp51/chrome-profile-')
  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userData}`,
      '--window-size=412,915',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  try {
    await waitPort(PORT)
    const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) =>
      r.json(),
    )
    // open a page
    const listBefore = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
      r.json(),
    )
    let target = listBefore.find((t) => t.type === 'page')
    if (!target) {
      await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, {
        method: 'PUT',
      })
      await sleep(500)
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
      target = list.find((t) => t.type === 'page')
    }

    const session = await cdp(target.webSocketDebuggerUrl)
    const { send, events } = session

    await send('Network.enable')
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Performance.enable')
    await send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: ((1.6 * 1024 * 1024) / 8),
      uploadThroughput: ((750 * 1024) / 8),
      connectionType: 'cellular4g',
    })
    await send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      mobile: true,
    })
    await send('Emulation.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    })

    // PerformanceObserver in page for LCP + paint + longtask
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__lcp51 = { lcp: null, paints: [], longtasks: [], marks: [], navStart: 0 };
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__lcp51.lcp = {
              startTime: e.startTime,
              size: e.size,
              url: e.url,
              id: e.id,
              renderTime: e.renderTime || null,
              loadTime: e.loadTime || null,
              element: e.element ? (e.element.tagName + '.' + (e.element.className||'')) : null
            };
          }
        }).observe({type:'largest-contentful-paint', buffered:true});
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) window.__lcp51.paints.push({name:e.name, startTime:e.startTime});
        }).observe({type:'paint', buffered:true});
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) window.__lcp51.longtasks.push({startTime:e.startTime, duration:e.duration});
          }).observe({type:'longtask', buffered:true});
        } catch (_) {}
      `,
    })

    await send('Page.navigate', { url: URL })
    await send('Page.loadEventFired').catch(() => {})
    // wait for network quiet + LCP settle
    await sleep(8000)

    const metrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const res = performance.getEntriesByType('resource');
        const bg = res.find(r => r.name.includes('kv-bg') || (window.__lcp51?.lcp?.url && r.name === window.__lcp51.lcp.url));
        const img = document.querySelector('img.kv-bg-img');
        const cs = img ? getComputedStyle(img) : null;
        return {
          href: location.href,
          lcp: window.__lcp51.lcp,
          paints: window.__lcp51.paints,
          longtasks: window.__lcp51.longtasks,
          nav: nav ? {
            startTime: nav.startTime,
            responseStart: nav.responseStart,
            domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
            loadEventEnd: nav.loadEventEnd,
            transferSize: nav.transferSize,
          } : null,
          bgResource: bg ? {
            name: bg.name,
            transferSize: bg.transferSize,
            encodedBodySize: bg.encodedBodySize,
            decodedBodySize: bg.decodedBodySize,
            duration: bg.duration,
            requestStart: bg.requestStart,
            responseEnd: bg.responseEnd,
            startTime: bg.startTime,
            initiatorType: bg.initiatorType,
            renderBlockingStatus: bg.renderBlockingStatus,
          } : null,
          imgState: img ? {
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            currentSrc: img.currentSrc,
            opacity: cs.opacity,
            visibility: cs.visibility,
            display: cs.display,
            fetchPriority: img.fetchPriority,
            loading: img.loading,
            decoding: img.decoding,
          } : null,
          timing: performance.timing ? {
            navigationStart: performance.timing.navigationStart,
            responseStart: performance.timing.responseStart - performance.timing.navigationStart,
            domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
            domComplete: performance.timing.domComplete - performance.timing.navigationStart,
          } : null
        };
      })()`,
      returnByValue: true,
    })

    const data = metrics.result.value

    // Derive LCP phases (web.dev formula approximations using resource timing)
    // TTFB ≈ responseStart
    // Resource load delay ≈ requestStart - TTFB (discovery delay)  OR max(0, requestStart - activation)
    // Resource load duration ≈ responseEnd - requestStart
    // Element render delay ≈ LCP - responseEnd
    const ttfb = data.nav?.responseStart ?? data.timing?.responseStart ?? null
    const lcpT = data.lcp?.startTime ?? null
    const reqStart = data.bgResource?.requestStart ?? null
    const resEnd = data.bgResource?.responseEnd ?? null

    let phases = null
    if (lcpT != null && ttfb != null && reqStart != null && resEnd != null) {
      phases = {
        TTFB_ms: Math.round(ttfb),
        loadDelay_ms: Math.round(Math.max(0, reqStart - ttfb)),
        loadDuration_ms: Math.round(Math.max(0, resEnd - reqStart)),
        renderDelay_ms: Math.round(Math.max(0, lcpT - resEnd)),
        lcp_ms: Math.round(lcpT),
        note: 'Derived from Navigation Timing + Resource Timing + LCP entry under 4x CPU / Slow 4G emulation',
      }
    }

    const out = { url: URL, capturedAt: new Date().toISOString(), phases, data }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
    console.log(JSON.stringify({ out: OUT, phases, lcp: data.lcp, bg: data.bgResource?.encodedBodySize, longtasks: data.longtasks?.length }, null, 2))
    session.close()
  } finally {
    chrome.kill()
    await sleep(300)
    try {
      fs.rmSync(userData, { recursive: true, force: true })
    } catch {}
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
