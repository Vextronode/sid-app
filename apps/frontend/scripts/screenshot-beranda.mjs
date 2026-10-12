// Skrip screenshot beranda (K12): mengambil tangkapan layar halaman lokal di
// lebar 1440px dan 360px, ditambah mockup acuan, lalu mencetak laporan
// pengecekan sederhana (scroll horizontal, jumlah h1, target sentuh, ukuran teks).
//
// Pemakaian (dari apps/frontend):
//   npm run shot:beranda -- [opsi]
//
// Opsi:
//   --url <base>        Server yang dituju (default http://127.0.0.1:5173).
//                       Bila tidak bisa dijangkau, dev server Vite dijalankan otomatis.
//   --out <dir>         Folder hasil (default docs/refactor-beranda/screenshots)
//   --label <nama>      Awalan nama file (default "shot")
//   --pages <daftar>    Path dipisah koma (default "beranda"). Alias: "beranda" = "/",
//                       "regresi" = /berita, /profil-desa, /loginpage, /daftar-surat@warga.
//                       Akhiran "@warga" / "@guest" mengatur status login per halaman.
//   --auth warga|guest  Status login default (default guest)
//   --live              Pakai backend asli, bukan fixture
//   --no-hero           Gagalkan permintaan foto hero (uji latar fallback)
//   --reduced-motion    Emulasikan prefers-reduced-motion: reduce
//   --no-mockup         Jangan ambil screenshot mockup acuan

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'

import { resolveFixture } from './fixtures/public-api.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = resolve(SCRIPT_DIR, '..')
const REFACTOR_DIR = resolve(FRONTEND_DIR, '../../docs/refactor-beranda')
const MOCKUP_PATH = resolve(REFACTOR_DIR, 'reference/mockup.html')

const WIDTHS = [1440, 360]
const HEIGHT = 900
const PAGE_ALIASES = {
  // Alias "beranda" berguna di Git Bash, yang mengubah argumen "/" menjadi path Windows.
  beranda: ['/'],
  regresi: ['/berita', '/profil-desa', '/loginpage', '/daftar-surat@warga'],
}

function parseArgs(argv) {
  const opts = {
    url: 'http://127.0.0.1:5173',
    out: resolve(REFACTOR_DIR, 'screenshots'),
    label: 'shot',
    pages: ['/'],
    auth: 'guest',
    live: false,
    noHero: false,
    reducedMotion: false,
    mockup: true,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => argv[++i]

    if (arg === '--url') opts.url = next().replace(/\/$/, '')
    else if (arg === '--out') opts.out = resolve(process.cwd(), next())
    else if (arg === '--label') opts.label = next()
    else if (arg === '--pages') {
      opts.pages = next()
        .split(',')
        .flatMap((p) => PAGE_ALIASES[p.trim()] ?? [p.trim()])
        .filter(Boolean)
    } else if (arg === '--auth') opts.auth = next()
    else if (arg === '--live') opts.live = true
    else if (arg === '--no-hero') opts.noHero = true
    else if (arg === '--reduced-motion') opts.reducedMotion = true
    else if (arg === '--no-mockup') opts.mockup = false
    else throw new Error(`Opsi tidak dikenal: ${arg}`)
  }

  return opts
}

async function isReachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

async function ensureServer(baseUrl) {
  if (await isReachable(baseUrl)) return null

  const { port } = new URL(baseUrl)
  console.log(`Server ${baseUrl} tidak aktif, menjalankan dev server Vite...`)
  const viteBin = resolve(FRONTEND_DIR, 'node_modules/vite/bin/vite.js')
  const child = spawn(process.execPath, [viteBin, '--port', port || '5173', '--strictPort'], {
    cwd: FRONTEND_DIR,
    stdio: 'ignore',
  })

  for (let i = 0; i < 60; i += 1) {
    if (await isReachable(baseUrl)) return child
    await new Promise((r) => setTimeout(r, 500))
  }

  stopServer(child)
  throw new Error(`Dev server tidak bisa dijangkau di ${baseUrl}`)
}

function stopServer(child) {
  if (!child) return
  child.kill()
}

function slugFor(path) {
  const clean = path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-')
  return clean || 'beranda'
}

// Dijalankan di browser: pengecekan yang dicetak di laporan.
function inspectPage() {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const label = (el) =>
    (el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || el.tagName)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50)

  const smallTargets = [...document.querySelectorAll('a[href], button, [role="button"], input, select, textarea')]
    .filter(visible)
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width < 44 || r.height < 44
    })
    .map((el) => {
      const r = el.getBoundingClientRect()
      return `${label(el)} (${Math.round(r.width)}x${Math.round(r.height)})`
    })

  // Meta (02-design-tokens: 13–15px, mis. tanggal dan sumber data) ditandai
  // kelas `bd-meta` dan dilaporkan terpisah; di atas 15px tetap dianggap teks isi.
  const fontSize = (el) => parseFloat(getComputedStyle(el).fontSize)
  const isMeta = (el) => Boolean(el.closest('.bd-meta')) && fontSize(el) <= 15
  const textBlocks = [...document.querySelectorAll('p, li')]
    .filter(visible)
    .filter((el) => el.textContent.trim().length > 0)
    .filter((el) => fontSize(el) < 18)
  const describeText = (el) => `${label(el)} (${getComputedStyle(el).fontSize})`
  const smallText = textBlocks.filter((el) => !isMeta(el)).map(describeText)
  const metaText = textBlocks.filter(isMeta).map(describeText)

  // Ikon SVG yang tidak disembunyikan dari pembaca layar dan tidak berlabel (Ak4).
  const exposedSvgs = [...document.querySelectorAll('svg')]
    .filter((svg) => !svg.closest('[aria-hidden="true"]'))
    .filter((svg) => !svg.getAttribute('aria-label') && svg.getAttribute('role') !== 'img')
    .map((svg) => label(svg.parentElement))

  const root = document.documentElement
  return {
    horizontalScroll: root.scrollWidth > root.clientWidth,
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    h1Count: document.querySelectorAll('h1').length,
    smallTargets,
    smallText,
    metaText,
    exposedSvgs,
  }
}

async function capture(browser, opts, { name, url, width, auth, useFixture }) {
  const context = await browser.newContext({
    viewport: { width, height: HEIGHT },
    reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference',
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    // 401 dari /api/user adalah perilaku normal saat belum login.
    if (msg.type() !== 'error') return
    if (auth === 'guest' && msg.text().includes('401 (Unauthorized)')) return
    consoleErrors.push(msg.text())
  })

  if (useFixture) {
    await page.route(
      (u) => u.pathname.startsWith('/api/') || u.pathname.startsWith('/sanctum/'),
      (route) => {
        const { pathname } = new URL(route.request().url())
        const { status, body } = resolveFixture(pathname, auth)
        return route.fulfill({
          status,
          contentType: 'application/json',
          body: body === null ? '' : JSON.stringify(body),
        })
      },
    )
  }
  if (opts.noHero) {
    await page.route((u) => u.pathname.includes('/assets/image/beranda/'), (route) => route.abort())
  }

  await page.goto(url, { waitUntil: 'networkidle' })
  // Beri waktu animasi masuk (rise 600ms + jeda 240ms) selesai.
  await page.waitForTimeout(1000)

  const file = resolve(opts.out, `${opts.label}-${name}-${width}.png`)
  await page.screenshot({ path: file, fullPage: true })
  const report = await page.evaluate(inspectPage)
  await context.close()

  return { name, width, auth, url, file, ...report, consoleErrors }
}

function printReport(r) {
  console.log(`\n■ ${r.name} @ ${r.width}px (${r.auth})`)
  console.log(`  file           : ${r.file}`)
  console.log(`  scroll horizontal: ${r.horizontalScroll ? `YA (${r.scrollWidth} > ${r.clientWidth})` : 'tidak'}`)
  console.log(`  jumlah <h1>    : ${r.h1Count}`)
  console.log(`  target < 44px  : ${r.smallTargets.length}${r.smallTargets.length ? ` — ${r.smallTargets.slice(0, 5).join('; ')}` : ''}`)
  console.log(`  teks p/li < 18px: ${r.smallText.length}${r.smallText.length ? ` — ${r.smallText.slice(0, 3).join('; ')}` : ''}`)
  console.log(`  meta (bd-meta) : ${r.metaText.length}${r.metaText.length ? ` — ${r.metaText.slice(0, 3).join('; ')}` : ''}`)
  console.log(`  svg tanpa aria : ${r.exposedSvgs.length}${r.exposedSvgs.length ? ` — ${r.exposedSvgs.slice(0, 3).join('; ')}` : ''}`)
  console.log(`  error konsol   : ${r.consoleErrors.length}${r.consoleErrors.length ? ` — ${r.consoleErrors.slice(0, 2).join(' | ')}` : ''}`)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  await mkdir(opts.out, { recursive: true })

  const server = await ensureServer(opts.url)
  const browser = await chromium.launch()
  const results = []

  try {
    for (const spec of opts.pages) {
      const [path, pageAuth] = spec.split('@')
      for (const width of WIDTHS) {
        results.push(
          await capture(browser, opts, {
            name: slugFor(path),
            url: `${opts.url}${path}`,
            width,
            auth: pageAuth || opts.auth,
            useFixture: !opts.live,
          }),
        )
      }
    }

    if (opts.mockup) {
      results.push(
        await capture(browser, opts, {
          name: 'mockup',
          url: pathToFileURL(MOCKUP_PATH).href,
          width: 1440,
          auth: '-',
          useFixture: false,
        }),
      )
    }
  } finally {
    await browser.close()
    stopServer(server)
  }

  results.forEach(printReport)
  const reportFile = resolve(opts.out, `${opts.label}-report.json`)
  await writeFile(reportFile, JSON.stringify(results, null, 2))
  console.log(`\nLaporan: ${reportFile}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
