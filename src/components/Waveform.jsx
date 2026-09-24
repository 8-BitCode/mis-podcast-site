import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../lib/format.js'

/**
 * Procedural waveform. Every episode gets a unique bar pattern generated
 * from its slug — same slug, same waveform, every render, no audio
 * analysis needed. One bar is picked out in red as the "anomaly".
 *
 * Scaling: preserveAspectRatio="none" so the bars fill whatever box they're
 * given (wide lead card, 16:9 card, tiny player strip) instead of being
 * cropped. Strokes use non-scaling-stroke in CSS, and the label is HTML so
 * neither gets stretched.
 *
 * Motion: bars idle-animate while the waveform is on screen (data-live), so
 * only the handful of visible cards ever animate, not the whole archive.
 *
 * When `interactive`, clicking seeks the site-wide player to that fraction
 * of the track (via onSeek), and `progress` (0..1) marks played bars.
 */
function hashString(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildColumns(seed, bars) {
  const seedNum = hashString(String(seed))
  const rand = mulberry32(seedNum)
  const W = 320
  const H = 180
  const mid = H / 2
  const p1 = rand() * 6.28
  const p2 = rand() * 6.28
  const f1 = 0.18 + rand() * 0.28
  const f2 = 0.5 + rand() * 0.7
  const anomaly = 6 + Math.floor(rand() * Math.max(1, bars - 12))
  const step = W / bars

  const columns = Array.from({ length: bars }, (_, i) => {
    const wave = 0.5 + 0.5 * Math.sin(i * f1 + p1)
    const ripple = 0.55 + 0.45 * Math.sin(i * f2 + p2)
    let h = 0.1 + 0.55 * wave * ripple + rand() * 0.2
    if (i === anomaly) h = 0.95
    h = Math.min(0.95, h)
    const half = h * (mid - 14)
    return {
      x: +(i * step + step * 0.2).toFixed(2),
      y: +(mid - half).toFixed(2),
      w: +(step * 0.6).toFixed(2),
      h: +(half * 2).toFixed(2),
      o: +(0.55 + rand() * 0.45).toFixed(2), // was 0.35–1: too faint on the dark panel
      hot: i === anomaly,
      frac: +(i / bars).toFixed(4),
    }
  })
  const code = seedNum.toString(16).toUpperCase().padStart(8, '0').slice(0, 6)
  return { columns, code, W, H, mid }
}

export default function Waveform({ seed = 'mis', bars = 46, interactive = false, label, progress = 0, onSeek }) {
  const { columns, code, W, H, mid } = useMemo(() => buildColumns(seed, bars), [seed, bars])
  const wrapRef = useRef(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !('IntersectionObserver' in window)) {
      setLive(true)
      return
    }
    const io = new IntersectionObserver(([en]) => setLive(en.isIntersecting), { rootMargin: '60px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="waveform-wrap" ref={wrapRef}>
      <svg
        className={cx('waveform', { 'is-interactive': interactive })}
        data-waveform
        data-live={live}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Episode waveform"
        onClick={
          interactive && onSeek
            ? (e) => {
                // Seek only. Without this the click bubbles to the card's
                // play button and pauses the episode you just scrubbed.
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                onSeek((e.clientX - rect.left) / rect.width)
              }
            : undefined
        }
      >
        <rect width={W} height={H} className="wf-bg" />
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="wf-grid" />
        ))}
        <line x1="0" x2={W} y1={mid} y2={mid} className="wf-axis" />
        {columns.map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            className={cx('wf-bar', { 'is-hot': c.hot, 'is-played': interactive && c.frac <= progress })}
            data-frac={c.frac}
            style={{ '--i': i, opacity: c.hot ? 1 : c.o }}
          />
        ))}
      </svg>
      <span className="wf-label" aria-hidden="true">
        {label ?? `SIG ${code}`}
      </span>
    </div>
  )
}