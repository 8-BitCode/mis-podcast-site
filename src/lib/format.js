const TZ = 'Europe/London'

/** 12 MAR 2026 — pinned to UK time so the display doesn't shift with the viewer's clock. */
export const fmtDate = (d, month = 'short') =>
  new Date(d)
    .toLocaleDateString('en-GB', { day: '2-digit', month, year: 'numeric', timeZone: TZ })
    .toUpperCase()

/** Seconds → "42:07" / "1:03:20". Used for episode duration everywhere. */
export const fmtDuration = (totalSeconds = 0) => {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`
}

export const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export const slugify = (s = '') =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Walks a show-notes HTML string, gives every <h2>/<h3> an id (slugified
 * from its own text, de-duped if two headings collide), and returns both
 * the patched HTML and a flat list for the "TIMESTAMPS" contents nav.
 */
export function injectHeadingIds(html = '') {
  const headings = []
  const used = new Set()
  const patched = html.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (match, level, attrs = '', inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim()
    let id = slugify(text) || 'section'
    let n = 2
    while (used.has(id)) id = `${slugify(text)}-${n++}`
    used.add(id)
    headings.push({ id, text, level: Number(level) })
    const cleanAttrs = attrs.replace(/\sid="[^"]*"/i, '')
    return `<h${level} id="${id}"${cleanAttrs}>${inner}</h${level}>`
  })
  return { html: patched, headings }
}

/** Tiny class-list helper, standing in for Astro's `class:list`. */
export function cx(...args) {
  const out = []
  for (const a of args) {
    if (!a) continue
    if (typeof a === 'string') out.push(a)
    else if (Array.isArray(a)) out.push(cx(...a))
    else if (typeof a === 'object') {
      for (const k in a) if (a[k]) out.push(k)
    }
  }
  return out.join(' ')
}
