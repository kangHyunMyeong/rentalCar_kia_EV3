/**
 * STEP 6 final QA — lazy, SEO DOM, anchors, assets, trust (prod build via preview)
 */
import fs from 'fs'
import puppeteer from 'puppeteer-core'

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:4173'
const OUT = 'perf-reports/step6'
fs.mkdirSync(OUT, { recursive: true })

const SECTION_IDS = [
  'top',
  'why-ev3',
  'design',
  'color-studio',
  'quote',
  'faq',
  'consultation-cta',
  'site-footer',
]

const KEYWORDS = [
  '기아 EV3 장기렌트',
  'EV3 장기렌트 견적',
  '예상 월 렌트료',
  '계약기간',
  '연간 주행거리',
  '선납금',
  '보증금',
  '핏카컴퍼니',
]

function snapshot(label, page) {
  return page.evaluate(
    ({ ids, keywords, label }) => {
      const text = document.body?.innerText || ''
      const html = document.documentElement?.outerHTML || ''
      const present = Object.fromEntries(ids.map((id) => [id, !!document.getElementById(id)]))
      const kw = Object.fromEntries(keywords.map((k) => [k, text.includes(k)]))
      return {
        label,
        title: document.title,
        hasRootChildren: (document.getElementById('root')?.childElementCount || 0) > 0,
        hasHero: !!document.querySelector('section#top, .kv'),
        hasHeader: !!document.querySelector('header'),
        sections: present,
        sectionCount: Object.values(present).filter(Boolean).length,
        keywords: kw,
        keywordHits: Object.values(kw).filter(Boolean).length,
        trustDemoNumbers: /\b2480\b/.test(text) || /\b742\b/.test(text) || /\b186\b/.test(text),
        h1: [...document.querySelectorAll('h1')].map((el) => el.textContent?.trim()),
        h2Count: document.querySelectorAll('h2').length,
        consoleNote: null,
      }
    },
    { ids: SECTION_IDS, keywords: KEYWORDS, label },
  )
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})

const report = {
  capturedAt: new Date().toISOString(),
  base: BASE,
  stages: {},
  anchors: {},
  assets: {},
  seo: {},
  quote: {},
  color: {},
  responsive: {},
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
}

try {
  const page = await browser.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => report.pageErrors.push(String(err)))
  page.on('requestfailed', (req) => {
    report.failedRequests.push({ url: req.url(), err: req.failure()?.errorText })
  })
  page.on('response', (res) => {
    if (res.status() >= 400) {
      report.failedRequests.push({ url: res.url(), status: res.status() })
    }
  })

  // --- Stage 0: raw HTML (no JS wait beyond document) ---
  const client = await page.createCDPSession()
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })

  // Fetch raw HTML via evaluate after goto with waitUntil:domcontentloaded quickly
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  report.stages.t0_domcontentloaded = await snapshot('t0_domcontentloaded', page)

  // Immediately after (JS may still be loading)
  await new Promise((r) => setTimeout(r, 100))
  report.stages.t1_js_100ms = await snapshot('t1_js_100ms', page)

  // Wait for BelowFold sections without user interaction
  await page.waitForSelector('#quote', { timeout: 15000 }).catch(() => null)
  await page.waitForSelector('#faq', { timeout: 15000 }).catch(() => null)
  report.stages.t2_belowfold_ready = await snapshot('t2_belowfold_ready', page)

  // Idle wait (no click/scroll)
  await new Promise((r) => setTimeout(r, 2500))
  report.stages.t3_idle_2500ms = await snapshot('t3_idle_2500ms', page)

  // --- SEO head ---
  report.seo = await page.evaluate(() => {
    const abs = (u) => {
      try {
        return new URL(u, location.origin).href
      } catch {
        return u
      }
    }
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || null
    const href = (sel) => document.querySelector(sel)?.getAttribute('href') || null
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        return JSON.parse(s.textContent || '')
      } catch {
        return { parseError: true }
      }
    })
    const favicons = [...document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]')].map(
      (l) => ({
        rel: l.getAttribute('rel'),
        href: l.getAttribute('href'),
        type: l.getAttribute('type'),
        sizes: l.getAttribute('sizes'),
      }),
    )
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      keywords: meta('meta[name="keywords"]'),
      canonical: href('link[rel="canonical"]'),
      lang: document.documentElement.lang,
      themeColor: meta('meta[name="theme-color"]'),
      viewport: meta('meta[name="viewport"]'),
      og: {
        type: meta('meta[property="og:type"]'),
        title: meta('meta[property="og:title"]'),
        description: meta('meta[property="og:description"]'),
        url: meta('meta[property="og:url"]'),
        image: meta('meta[property="og:image"]'),
        site_name: meta('meta[property="og:site_name"]'),
        locale: meta('meta[property="og:locale"]'),
        imageWidth: meta('meta[property="og:image:width"]'),
        imageHeight: meta('meta[property="og:image:height"]'),
        imageType: meta('meta[property="og:image:type"]'),
      },
      twitter: {
        card: meta('meta[name="twitter:card"]'),
        title: meta('meta[name="twitter:title"]'),
        description: meta('meta[name="twitter:description"]'),
        image: meta('meta[name="twitter:image"]'),
      },
      favicons,
      jsonLd: ld,
      preloadKv: href('link[rel="preload"][href*="kv-bg"]'),
    }
  })

  // --- Assets HEAD ---
  const assetPaths = [
    '/assets/ev3/kv-bg.webp',
    '/assets/ev3/ogimage.webp',
    '/assets/ev3/favicons/favicon.ico',
    '/assets/ev3/favicons/favicon.svg',
    '/assets/ev3/favicons/favicon-16x16.png',
    '/assets/ev3/favicons/favicon-32x32.png',
    '/assets/ev3/favicons/apple-touch-icon.png',
    '/assets/ev3/lcp-candidates/A-webp-q88.webp',
  ]
  for (const p of assetPaths) {
    try {
      const res = await page.goto(BASE + p, { waitUntil: 'commit', timeout: 15000 })
      report.assets[p] = {
        status: res?.status() ?? null,
        contentType: res?.headers()['content-type'] ?? null,
      }
    } catch (e) {
      report.assets[p] = { error: String(e) }
    }
  }

  // Back to app for interaction tests
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Scenario A: click quote nav within 1s
  const anchorA = await page.evaluate(async () => {
    const start = performance.now()
    // try click immediately
    const link =
      document.querySelector('a[href="#quote"]') ||
      [...document.querySelectorAll('a,button')].find((el) =>
        (el.textContent || '').includes('장기렌트 견적'),
      )
    if (!link) return { ok: false, reason: 'nav_not_found', ms: 0 }
    link.click()
    // wait up to 3s for #quote into view
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
      const el = document.getElementById('quote')
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight && r.bottom > 0) {
          return {
            ok: true,
            ms: Math.round(performance.now() - start),
            top: Math.round(r.top),
            existedImmediately: true,
          }
        }
      }
      await new Promise((r) => setTimeout(r, 50))
    }
    return {
      ok: !!document.getElementById('quote'),
      ms: Math.round(performance.now() - start),
      reason: document.getElementById('quote') ? 'not_in_view' : 'missing',
      top: document.getElementById('quote')?.getBoundingClientRect().top ?? null,
    }
  })
  report.anchors.scenarioA_quote_within_1s = anchorA

  // Scenario B: fast scroll to bottom
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  const scrollB = await page.evaluate(async () => {
    const before = {
      sh: document.documentElement.scrollHeight,
      sections: ['why-ev3', 'design', 'color-studio', 'quote', 'faq', 'consultation-cta'].map(
        (id) => !!document.getElementById(id),
      ),
    }
    // rapid scrolls
    for (let i = 0; i < 8; i++) {
      window.scrollBy(0, 600)
      await new Promise((r) => setTimeout(r, 30))
    }
    window.scrollTo(0, document.documentElement.scrollHeight)
    await new Promise((r) => setTimeout(r, 800))
    const afterIds = ['why-ev3', 'design', 'color-studio', 'quote', 'faq', 'consultation-cta', 'site-footer']
    return {
      before,
      afterHeight: document.documentElement.scrollHeight,
      afterSections: Object.fromEntries(afterIds.map((id) => [id, !!document.getElementById(id)])),
      allPresent: afterIds.every((id) => !!document.getElementById(id)),
    }
  })
  report.anchors.scenarioB_fast_scroll = scrollB

  // Wait full load then Scenario C floating bar → quote
  await page.waitForSelector('#quote', { timeout: 15000 })
  await page.evaluate(() => {
    // force past hero so floating bar may show
    document.getElementById('why-ev3')?.scrollIntoView()
  })
  await new Promise((r) => setTimeout(r, 600))
  const floatC = await page.evaluate(async () => {
    const bar = document.querySelector('[class*="floating-estimate"], .floating-estimate-bar, aside')
    // try known structure
    const btn =
      document.querySelector('button[aria-label*="견적"]') ||
      document.querySelector('.floating-estimate-bar button') ||
      [...document.querySelectorAll('button')].find((b) =>
        (b.getAttribute('aria-label') || b.textContent || '').includes('장기렌트 견적'),
      )
    if (!btn) {
      return {
        ok: false,
        reason: 'floating_btn_not_found',
        barVisible: !!document.querySelector('.floating-estimate-bar'),
      }
    }
    btn.click()
    await new Promise((r) => setTimeout(r, 500))
    const quote = document.getElementById('quote')
    const r = quote?.getBoundingClientRect()
    return {
      ok: !!quote && r && r.top < window.innerHeight,
      top: r ? Math.round(r.top) : null,
      aria: btn.getAttribute('aria-label'),
    }
  })
  report.anchors.scenarioC_floating = floatC

  // Scenario D: faq -> consultation
  await page.evaluate(() => document.getElementById('faq')?.scrollIntoView())
  await new Promise((r) => setTimeout(r, 300))
  const d = await page.evaluate(async () => {
    document.getElementById('consultation-cta')?.scrollIntoView({ behavior: 'instant' })
    await new Promise((r) => setTimeout(r, 200))
    const el = document.getElementById('consultation-cta')
    const r = el?.getBoundingClientRect()
    return { ok: !!el && r.top < window.innerHeight, top: r ? Math.round(r.top) : null }
  })
  report.anchors.scenarioD_faq_to_cta = d

  // All anchors existence
  report.anchors.allIds = await page.evaluate((ids) => {
    return Object.fromEntries(ids.map((id) => [id, !!document.getElementById(id)]))
  }, SECTION_IDS)

  // Quote smoke: change trim if select exists
  report.quote = await page.evaluate(async () => {
    const select = document.querySelector('#rental-trim-select, select')
    const amountBefore =
      document.querySelector('[class*="Estimate"], aside')?.textContent?.match(/[\d,]+/)?.[0] ||
      null
    let changed = false
    if (select && select.options.length > 1) {
      const next = [...select.options].find((o) => !o.disabled && o.value !== select.value)
      if (next) {
        select.value = next.value
        select.dispatchEvent(new Event('change', { bubbles: true }))
        changed = true
        await new Promise((r) => setTimeout(r, 300))
      }
    }
    const notice = (document.body.innerText || '').includes('예상')
    const ref = (document.body.innerText || '').includes('참고')
    return {
      hasTrimSelect: !!select,
      optionCount: select?.options?.length ?? 0,
      changed,
      hasExpectedWording: notice || ref || (document.body.innerText || '').includes('월 예상'),
      amountSample: amountBefore,
    }
  })

  // Color studio smoke
  report.color = await page.evaluate(async () => {
    document.getElementById('color-studio')?.scrollIntoView()
    await new Promise((r) => setTimeout(r, 400))
    const options = [...document.querySelectorAll('#color-studio [role="option"] button, #color-studio button[aria-label*="컬러"]')]
    const img = document.querySelector('#color-studio img:not([aria-hidden])')
    const beforeSrc = img?.currentSrc || img?.src || null
    if (options.length > 1) {
      options[1].click()
      await new Promise((r) => setTimeout(r, 700))
    }
    const afterSrc = img?.currentSrc || img?.src || null
    const label = document.querySelector('#color-studio [aria-live]')?.textContent || null
    return {
      optionCount: options.length,
      beforeSrc,
      afterSrc,
      srcChanged: beforeSrc !== afterSrc,
      liveLabel: label?.trim()?.slice(0, 80) || null,
    }
  })

  // Responsive overflow checks
  const viewports = [
    [1920, 1080],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [375, 812],
  ]
  for (const [w, h] of viewports) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 768 })
    await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 })
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasHScroll: doc.scrollWidth > doc.clientWidth + 1,
        sections: ['top', 'quote', 'faq', 'color-studio'].every((id) => !!document.getElementById(id)),
      }
    })
    report.responsive[`${w}x${h}`] = overflow
  }
} finally {
  await browser.close()
}

fs.writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  out: `${OUT}/qa-report.json`,
  stages: Object.fromEntries(
    Object.entries(report.stages).map(([k, v]) => [
      k,
      { sections: v.sectionCount, keywords: v.keywordHits, trustDemo: v.trustDemoNumbers, h1: v.h1 },
    ]),
  ),
  anchors: report.anchors,
  quote: report.quote,
  color: report.color,
  assets: report.assets,
  seoTitle: report.seo.title,
  seoCanonical: report.seo.canonical,
  consoleErrors: report.consoleErrors.slice(0, 10),
  pageErrors: report.pageErrors.slice(0, 10),
  failedRequests: report.failedRequests.filter((f) => !String(f.url).includes('favicon')).slice(0, 20),
  responsive: report.responsive,
}, null, 2))
