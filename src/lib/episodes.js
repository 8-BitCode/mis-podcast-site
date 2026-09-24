// src/lib/episodes.js
import { slugify } from './format.js'

// Both the RSS feed and the audio files live on hosts that don't send CORS
// headers. In dev and production we route them through Pages Functions (see
// /functions) which proxy server-side and add the headers the browser needs.
const FEED_URL = '/feed-proxy'
const AUDIO_PROXY = '/audio-proxy'

function proxied(url) {
  if (!url) return url
  try {
    const u = new URL(url)
    if (u.hostname === 'anchor.fm' || u.hostname.endsWith('.cloudfront.net')) {
      return `${AUDIO_PROXY}${u.pathname}${u.search}`
    }
  } catch {
    /* not a URL, leave it alone */
  }
  return url
}

function text(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() ?? ''
}

function parseFeed(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Feed is not valid XML')

  return [...doc.querySelectorAll('item')].map((item) => {
    const title = text(item, 'title')
    const rawDesc = text(item, 'description')
    const excerpt = rawDesc.replace(/<\/?[^>]+(>|$)/g, '').trim()
    const pubDate = text(item, 'pubDate')
    const enclosure = item.querySelector('enclosure')
    const durationRaw = text(item, 'itunes\\:duration, duration')
    const author = text(item, 'dc\\:creator, itunes\\:author, author')

    let durationSecs = 0
    if (durationRaw) {
      const parts = durationRaw.split(':').map(Number)
      if (parts.length === 3) durationSecs = parts[0] * 3600 + parts[1] * 60 + parts[2]
      else if (parts.length === 2) durationSecs = parts[0] * 60 + parts[1]
      else if (parts.length === 1 && !Number.isNaN(parts[0])) durationSecs = parts[0]
    }

    return {
      title,
      slug: slugify(title),
      author: author || null,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      duration: durationSecs,
      audioUrl: proxied(enclosure?.getAttribute('url') ?? ''),
      audioType: enclosure?.getAttribute('type') ?? '',
      excerpt,
      notesHtml: rawDesc,
    }
  })
}

function withFileNumbers(items) {
  return items
    .slice()
    .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt))
    .map((p, i) => ({ ...p, fileNo: String(i + 1).padStart(3, '0') }))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
}

let cache = null

/**
 * Fetches and parses the podcast feed, newest first. Cached for the tab's lifetime.
 *
 * An empty live feed is a real answer (zero episodes) and is shown as such.
 * If the feed can't be reached or parsed: in local dev only, fall back to the
 * bundled sample so the UI can still be worked on; in production return no
 * episodes rather than showing sample ones that may no longer exist. Failures
 * aren't cached, so the next visit retries.
 */
export async function getPosts() {
  if (cache) return cache

  try {
    const res = await fetch(FEED_URL)
    if (!res.ok) throw new Error(`Feed responded ${res.status}`)
    cache = withFileNumbers(parseFeed(await res.text()))
    return cache
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[episodes] DEV ONLY: live feed unavailable, showing the bundled SAMPLE feed.', err)
      const { default: sampleXml } = await import('./rss_sample.xml?raw')
      return withFileNumbers(parseFeed(sampleXml))
    }
    console.error('[episodes] Live feed unavailable.', err)
    return []
  }
}

export async function getPostsFull() {
  return getPosts()
}