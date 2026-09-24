// ══════════════════════════════════════════════════════════════════
// DISPATCHES — client effects, ported from fx.js.
//
// The original ran on Astro's astro:page-load / astro:before-swap events
// (fired on every ClientRouter page swap). In this SPA there's no such
// event: the React hooks in src/hooks/ call `initPage()` on route change
// and `bootOnce()` once at startup, and run the returned cleanup function
// on unmount / before the next route's effect — the same setup/teardown
// shape, just wired to React's lifecycle instead of Astro's.
// ══════════════════════════════════════════════════════════════════

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches
export const coarse = () => window.matchMedia('(hover: none), (pointer: coarse)').matches
export const smallScreen = () => window.matchMedia('(max-width: 52rem)').matches

// ── SFX (Web Audio, zero assets) ───────────────────────────────────
const SFX_KEY = 'mis-blog-sfx'
let audioCtx = null

export const sfxOn = () => {
  try {
    const saved = localStorage.getItem(SFX_KEY)
    if (saved) return saved !== 'off'
  } catch {
    /* storage blocked */
  }
  return !coarse()
}

function audio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

/** Crisp bandpass burst — folder snap. */
function playSnap() {
  if (!sfxOn()) return
  try {
    const ctx = audio()
    if (!ctx) return
    const size = ctx.sampleRate * 0.035
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1900
    filter.Q.value = 3
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.035)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    noise.start()
  } catch {
    /* blocked or unsupported */
  }
}

/** Low thud — stamp landing, toggles. */
function playThud() {
  if (!sfxOn()) return
  try {
    const ctx = audio()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch {
    /* blocked or unsupported */
  }
}

export const playThudIfLive = () => {
  if (audioCtx && audioCtx.state === 'running') playThud()
}

export function syncSfxToggles() {
  const on = sfxOn()
  document.querySelectorAll('[data-sfx-toggle]').forEach((btn) => {
    btn.textContent = on ? 'SFX: ON' : 'SFX: OFF'
    btn.setAttribute('aria-pressed', String(on))
  })
}

// ── One-time global listeners ───────────────────────────────────────
let booted = false

export function bootOnce() {
  if (booted) return
  booted = true

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest?.('[data-sfx-toggle]')
    if (toggle) {
      try {
        localStorage.setItem(SFX_KEY, sfxOn() ? 'off' : 'on')
      } catch {
        /* storage blocked */
      }
      syncSfxToggles()
      playThud()
      return
    }
    const hit = e.target.closest?.('a[href], button')
    if (!hit) return
    if (coarse() && hit.tagName === 'A') return
    playSnap()
  })

  if (!coarse()) {
    document.addEventListener(
      'pointermove',
      (e) => {
        const card = e.target.closest?.('.ep-card')
        if (!card) return
        const r = card.getBoundingClientRect()
        card.style.setProperty('--mx', `${e.clientX - r.left}px`)
        card.style.setProperty('--my', `${e.clientY - r.top}px`)
      },
      { passive: true },
    )
  }

  if (finePointer() && !reduced()) {
    let tx = -100
    let ty = -100
    let x = -100
    let y = -100
    let live = false
    const ret = () => document.querySelector('.reticle')

    window.addEventListener(
      'pointermove',
      (e) => {
        tx = e.clientX
        ty = e.clientY
        if (!live) {
          live = true
          x = tx
          y = ty
          ret()?.classList.add('is-live')
        }
      },
      { passive: true },
    )
    document.addEventListener('pointerover', (e) => {
      const lock = !!e.target.closest?.('a[href], button, input, [data-lock]')
      ret()?.classList.toggle('is-locked', lock)
    })
    document.documentElement.addEventListener('mouseleave', () => {
      live = false
      ret()?.classList.remove('is-live')
    })

    const tick = () => {
      x += (tx - x) * 0.22
      y += (ty - y) * 0.22
      const r = ret()
      if (r) r.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  initBackground()
}

// ── Decrypt text ───────────────────────────────────────────────────
const CHARSET = '!<>-_\\/[]{}—=+*^?#0123456789'

function armDecrypt(el) {
  if (el.dataset.dxArmed) return
  el.dataset.dxArmed = '1'
  const text = el.textContent
  el.dataset.text = text
  const sr = document.createElement('span')
  sr.className = 'sr-only'
  sr.textContent = text
  el.before(sr)
  el.setAttribute('aria-hidden', 'true')
}

function runDecrypt(el, speed = 28) {
  const text = el.dataset.text
  if (!text) return
  clearInterval(el._dx)
  el.classList.add('dx-on')
  const frames = Math.max(12, Math.min(46, Math.round(text.length * 1.2)))
  const step = text.length / frames
  const chars = text.split('')
  let progress = 0
  el._dx = setInterval(() => {
    el.textContent = chars
      .map((ch, i) => {
        if (ch === ' ') return ' '
        if (i < progress) return ch
        return CHARSET[Math.floor(Math.random() * CHARSET.length)]
      })
      .join('')
    progress += step
    if (progress >= text.length) {
      clearInterval(el._dx)
      el.textContent = text
    }
  }, speed)
}

export function initDecrypt(cleanups) {
  const els = [...document.querySelectorAll('[data-decrypt]')]
  if (!els.length) return
  const skip = reduced()

  els.forEach((el) => armDecrypt(el))
  cleanups.push(() => els.forEach((el) => clearInterval(el._dx)))

  els
    .filter((el) => el.dataset.decrypt === 'mount')
    .forEach((el) => {
      if (skip) return el.classList.add('dx-on')
      const t = setTimeout(() => runDecrypt(el), Number(el.dataset.delay) || 0)
      cleanups.push(() => clearTimeout(t))
    })

  const visible = els.filter((el) => el.dataset.decrypt === 'visible')
  if (visible.length) {
    if (skip || !('IntersectionObserver' in window)) {
      visible.forEach((el) => el.classList.add('dx-on'))
    } else {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((en) => {
            if (!en.isIntersecting) return
            io.unobserve(en.target)
            runDecrypt(en.target)
          }),
        { threshold: 0.6 },
      )
      visible.forEach((el) => io.observe(el))
      cleanups.push(() => io.disconnect())
    }
  }

  els
    .filter((el) => el.dataset.decrypt === 'hover')
    .forEach((el) => {
      if (skip) return
      const host = el.closest('[data-decrypt-host]') || el
      const go = () => runDecrypt(el, 22)
      host.addEventListener('mouseenter', go)
      host.addEventListener('focusin', go)
      cleanups.push(() => {
        host.removeEventListener('mouseenter', go)
        host.removeEventListener('focusin', go)
      })
    })
}

// ── Redaction bars that lift as content scrolls into view ──────────
export function initRedact(cleanups) {
  const els = [...document.querySelectorAll('[data-redact]')]
  if (!els.length) return
  if (reduced() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-open'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries
        .filter((en) => en.isIntersecting)
        .forEach((en, i) => {
          io.unobserve(en.target)
          const t = setTimeout(() => en.target.classList.add('is-open'), 120 + i * 110)
          cleanups.push(() => clearTimeout(t))
        })
    },
    { threshold: 0.25 },
  )
  els.forEach((el) => io.observe(el))
  cleanups.push(() => io.disconnect())
}

// ── Clock (Manchester time) ────────────────────────────────────────
export function initClock(cleanups) {
  const els = document.querySelectorAll('[data-clock]')
  if (!els.length) return
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const tick = () => els.forEach((el) => (el.textContent = `MCR ${fmt.format(new Date())}`))
  tick()
  const id = setInterval(tick, 1000)
  cleanups.push(() => clearInterval(id))
}

// ── Article: reading progress, contents spy, copy link, stamp thud ─
export function initArticle(cleanups) {
  // Astro's Base.astro set a data-article attribute on <main> per page; here
  // <main> is shared across routes, so the episode page's own wrapper class
  // is the reliable per-page marker instead.
  const article = document.querySelector('.article-page')
  if (!article) return
  const prose = article.querySelector('.prose')
  if (!prose) return

  const root = document.documentElement
  const pcts = document.querySelectorAll('[data-read-pct]')
  let raf = 0
  let maxScroll = 0
  let lastPct = -1

  const measure = () => {
    maxScroll = Math.max(0, root.scrollHeight - window.innerHeight)
  }
  const update = () => {
    raf = 0
    const y = window.scrollY
    let p = maxScroll > 0 ? y / maxScroll : 1
    if (maxScroll - y <= 2) p = 1
    p = Math.min(1, Math.max(0, p))
    root.style.setProperty('--read', p.toFixed(4))
    const pct = Math.round(p * 100)
    if (pct !== lastPct) {
      lastPct = pct
      pcts.forEach((el) => (el.textContent = `${pct}%`))
    }
  }
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update)
  }
  const remeasure = () => {
    measure()
    onScroll()
  }
  remeasure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', remeasure)

  let ro
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(remeasure)
    ro.observe(document.body)
  }
  document.fonts?.ready.then(remeasure)

  cleanups.push(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', remeasure)
    ro?.disconnect()
    cancelAnimationFrame(raf)
    root.style.removeProperty('--read')
  })

  const links = [...document.querySelectorAll('[data-toc-link]')]
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]))
    const heads = [...prose.querySelectorAll('h2[id], h3[id]')]
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return
          links.forEach((a) => a.classList.remove('is-active'))
          byId.get(en.target.id)?.classList.add('is-active')
        })
      },
      { rootMargin: '-15% 0px -75% 0px' },
    )
    heads.forEach((h) => io.observe(h))
    cleanups.push(() => io.disconnect())
  }

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('[data-copy-label]') || btn
    let t
    const handler = async () => {
      let ok = false
      try {
        await navigator.clipboard.writeText(location.href)
        ok = true
      } catch {
        /* clipboard blocked */
      }
      label.textContent = ok ? 'LINK COPIED' : 'PRESS CTRL+C TO COPY'
      clearTimeout(t)
      t = setTimeout(() => (label.textContent = 'COPY LINK'), 1800)
    }
    btn.addEventListener('click', handler)
    cleanups.push(() => btn.removeEventListener('click', handler))
  })

  const thud = setTimeout(playThudIfLive, 950)
  cleanups.push(() => clearTimeout(thud))
}

// ── Archive search (homepage) ───────────────────────────────────────
export function initSearch(cleanups) {
  const input = document.querySelector('[data-search]')
  if (!input) return
  const cards = [...document.querySelectorAll('[data-card]')]
  const count = document.querySelector('[data-search-count]')
  const empty = document.querySelector('[data-search-empty]')
  const handler = () => {
    const q = input.value.trim().toLowerCase()
    let n = 0
    cards.forEach((c) => {
      const hit = !q || c.dataset.search.includes(q)
      c.hidden = !hit
      if (hit) n += 1
    })
    if (count) count.textContent = q ? `${n} MATCH${n === 1 ? '' : 'ES'}` : `${cards.length} FILES`
    if (empty) empty.hidden = n !== 0
  }
  input.addEventListener('input', handler)
  cleanups?.push(() => input.removeEventListener('input', handler))
}

// ── 404: show the mistyped path in the terminal readout ─────────────
// (path text only — the "did you mean" suggestion list itself is computed
// in NotFoundPage.jsx with rankSuggestions() below and rendered by React,
// rather than built with imperative DOM here, so it can't fight React's
// reconciliation of the same subtree.)
export function initLost() {
  const term = document.querySelector('[data-terminal]')
  if (!term) return

  let path = location.pathname
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep raw */
  }
  const shown = path.length > 44 ? `${path.slice(0, 43)}…` : path
  document.querySelectorAll('[data-path]').forEach((el) => (el.textContent = shown))
  document
    .querySelectorAll('[data-path-short]')
    .forEach((el) => (el.textContent = path.replace(/^\/+|\/+$/g, '').slice(0, 24) || 'unknown'))
}

const bigrams = (s) => {
  const out = new Map()
  const t = s.replace(/[^a-z0-9]+/g, ' ').trim()
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2)
    out.set(g, (out.get(g) || 0) + 1)
  }
  return out
}
function dice(a, b) {
  const A = bigrams(a)
  const B = bigrams(b)
  let inter = 0
  let total = 0
  A.forEach((n) => (total += n))
  B.forEach((n) => (total += n))
  A.forEach((n, g) => {
    if (B.has(g)) inter += Math.min(n, B.get(g))
  })
  return total ? (2 * inter) / total : 0
}

/** posts: [{title, slug, fileNo}]. Returns up to 3 fuzzy matches for the current path, best first. */
export function rankSuggestions(pathname, posts = []) {
  let path = pathname
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep raw */
  }
  const want = path.replace(/^\/+|\/+$/g, '').toLowerCase()
  if (!want || !posts.length) return []
  return posts
    .map((p) => ({ p, score: Math.max(dice(want, p.slug), dice(want, p.title.toLowerCase())) }))
    .filter((r) => r.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.p)
}

// ── Ambient background: a slow signal network ───────────────────────
export function initBackground() {
  let canvas = document.querySelector('.bg-net')
  let ctx = canvas?.getContext('2d')
  if (!ctx) return

  const still = reduced()
  const LINK = 160
  const REACH = 210
  const PAD = 60
  const DIM = '138, 154, 147'
  const HOT = '57, 210, 255'

  let w = 0
  let h = 0
  let nodes = []
  const pings = []
  const pointer = { x: -9999, y: -9999 }
  let scrolled = window.scrollY
  let nextPing = 1.2
  let last = 0
  let raf = 0
  let paused = false
  let frameGap = 0

  const LANES = 4
  const lanes = Array.from({ length: LANES }, () => [])

  const wrap = (v, m) => ((v % m) + m) % m

  const size = () => {
    const small = smallScreen()
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5)
    frameGap = small ? 1 / 32 : 0
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const seed = () => {
    const small = smallScreen()
    const count = small
      ? Math.round(Math.min(30, Math.max(14, (w * h) / 26000)))
      : Math.round(Math.min(80, Math.max(26, (w * h) / 17000)))
    nodes = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 7
      return {
        u: Math.random(),
        v: Math.random(),
        dx: Math.cos(a) * speed,
        dy: Math.sin(a) * speed,
        depth: 0.12 + Math.random() * 0.4,
        r: 0.8 + Math.random() * 1.1,
        flash: 0,
        glow: 0,
        x: 0,
        y: 0,
      }
    })
  }

  const neighbours = (n) =>
    nodes.filter((m) => {
      if (m === n) return false
      const d = Math.hypot(m.x - n.x, m.y - n.y)
      return d < LINK && m.x > -PAD && m.x < w + PAD && m.y > -PAD && m.y < h + PAD
    })

  const launch = (from, hops = 2, avoid = null) => {
    const onScreen = nodes.filter((n) => n.x > 0 && n.x < w && n.y > 0 && n.y < h)
    const a = from || onScreen[Math.floor(Math.random() * onScreen.length)]
    if (!a) return
    const options = neighbours(a).filter((m) => m !== avoid)
    if (!options.length) return
    const b = options[Math.floor(Math.random() * options.length)]
    pings.push({ a, b, t: 0, dur: 0.7 + Math.random() * 0.5, hops })
  }

  const lerp = (a, b, t) => a + (b - a) * t

  const draw = (dt) => {
    const spanX = w + PAD * 2
    const spanY = h + PAD * 2
    ctx.clearRect(0, 0, w, h)

    for (const n of nodes) {
      n.u = wrap(n.u + (n.dx * dt) / spanX, 1)
      n.v = wrap(n.v + (n.dy * dt) / spanY, 1)
      n.x = n.u * spanX - PAD
      n.y = wrap(n.v * spanY - scrolled * n.depth, spanY) - PAD
      n.flash = Math.max(0, n.flash - dt * 1.3)
      n.glow = 0
    }

    ctx.lineWidth = 1
    for (let l = 0; l < LANES; l++) lanes[l].length = 0
    const LINK2 = LINK * LINK
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d2 = dx * dx + dy * dy
        if (d2 > LINK2) continue
        const k = 1 - Math.sqrt(d2) / LINK
        const lane = lanes[Math.min(LANES - 1, (k * LANES) | 0)]
        lane.push(a.x, a.y, b.x, b.y)
      }
    }
    for (let l = 0; l < LANES; l++) {
      const seg = lanes[l]
      if (!seg.length) continue
      ctx.strokeStyle = `rgba(${DIM}, ${(((l + 0.5) / LANES) * 0.17).toFixed(3)})`
      ctx.beginPath()
      for (let s = 0; s < seg.length; s += 4) {
        ctx.moveTo(seg[s], seg[s + 1])
        ctx.lineTo(seg[s + 2], seg[s + 3])
      }
      ctx.stroke()
    }

    if (pointer.x > -9000) {
      for (const n of nodes) {
        const d = Math.hypot(n.x - pointer.x, n.y - pointer.y)
        if (d > REACH) continue
        const k = 1 - d / REACH
        n.glow = k
        ctx.strokeStyle = `rgba(${HOT}, ${(k * 0.4).toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(pointer.x, pointer.y)
        ctx.lineTo(n.x, n.y)
        ctx.stroke()
      }
    }

    if (!still) {
      nextPing -= dt
      if (nextPing <= 0 && pings.length < 3) {
        launch(null, 2)
        nextPing = 1.6 + Math.random() * 2.6
      }
    }
    let i = pings.length
    while (i--) {
      const p = pings[i]
      p.t += dt / p.dur
      if (p.t >= 1) {
        p.b.flash = 1
        if (p.hops > 0 && Math.random() < 0.7) launch(p.b, p.hops - 1, p.a)
        pings.splice(i, 1)
        continue
      }
      const e = p.t * p.t * (3 - 2 * p.t)
      const t0 = Math.max(0, e - 0.16)
      const x = lerp(p.a.x, p.b.x, e)
      const y = lerp(p.a.y, p.b.y, e)
      ctx.strokeStyle = `rgba(${HOT}, 0.6)`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(lerp(p.a.x, p.b.x, t0), lerp(p.a.y, p.b.y, t0))
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.fillStyle = `rgba(${HOT}, 0.16)`
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(${HOT}, 0.95)`
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.lineWidth = 1

    for (const n of nodes) {
      if (n.x < -4 || n.x > w + 4 || n.y < -4 || n.y > h + 4) continue
      const hot = Math.max(n.glow * 0.9, n.flash)
      ctx.fillStyle = hot > 0.02 ? `rgba(${HOT}, ${(0.35 + hot * 0.65).toFixed(3)})` : `rgba(${DIM}, 0.4)`
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r + hot * 1.2, 0, Math.PI * 2)
      ctx.fill()
      if (n.flash > 0.02) {
        ctx.strokeStyle = `rgba(${HOT}, ${(n.flash * 0.55).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + (1 - n.flash) * 16, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const elapsed = (now - last) / 1000
    if (frameGap && elapsed < frameGap) return
    const dt = Math.min(0.05, elapsed || 0)
    last = now
    scrolled += (window.scrollY - scrolled) * Math.min(1, dt * 6)
    draw(dt)
  }

  size()
  seed()

  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth === w && Math.abs(window.innerHeight - h) < 120) return
      size()
      if (still) draw(0)
    },
    { passive: true },
  )
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return
      pointer.x = e.clientX
      pointer.y = e.clientY
    },
    { passive: true },
  )
  document.documentElement.addEventListener('mouseleave', () => {
    pointer.x = pointer.y = -9999
  })

  const wake = () => {
    paused = false
    if (still) return draw(0)
    cancelAnimationFrame(raf)
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  if (still) {
    draw(0)
    return
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf)
      raf = 0
    } else {
      wake()
    }
  })
  setInterval(() => {
    if (!paused && !document.hidden && performance.now() - last > 1500) wake()
  }, 2000)
  wake()
}

/** Combined per-page setup, matching the old astro:page-load `initPage()`. Returns a cleanup fn. */
export function initPage() {
  syncSfxToggles()
  const cleanups = []
  initDecrypt(cleanups)
  initRedact(cleanups)
  initClock(cleanups)
  initArticle(cleanups)
  initSearch(cleanups)
  initLost()
  return () => cleanups.forEach((fn) => fn())
}
