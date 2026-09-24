// worker/index.js
//
// Replaces functions/feed-proxy.js and functions/audio-proxy/[[path]].js,
// which are Cloudflare *Pages* Functions and are ignored by `wrangler deploy`.
// wrangler.jsonc's run_worker_first sends only these two routes here; every
// other request is served straight from ./dist, with unknown paths falling
// back to index.html for the React router.
//
// Both upstreams send no CORS headers, so the browser can't fetch them
// directly. We fetch server-side and re-serve with the headers it needs.

const FEED_URL = 'https://anchor.fm/s/11798adb0/podcast/rss'

async function proxyFeed() {
  const upstream = await fetch(FEED_URL, { redirect: 'follow' })

  const headers = new Headers(upstream.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Content-Type', 'application/xml; charset=utf-8')

  return new Response(upstream.body, { status: upstream.status, headers })
}

async function proxyAudio(request, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Build the upstream URL from the raw path so percent-encoded slashes (%2F)
  // in Anchor's audio URLs reach Anchor exactly as sent.
  const path = url.pathname.replace(/^\/audio-proxy/, '')
  const targetUrl = `https://anchor.fm${path}${url.search}`

  // Forward Range so seeking/scrubbing doesn't re-download the whole file.
  const upstreamHeaders = {}
  const range = request.headers.get('Range')
  if (range) upstreamHeaders.Range = range

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: upstreamHeaders,
    redirect: 'follow',
  })

  const headers = new Headers(upstream.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Headers', 'Range')
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')

  return new Response(upstream.body, { status: upstream.status, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/feed-proxy') return proxyFeed()
    if (url.pathname.startsWith('/audio-proxy/')) return proxyAudio(request, url)

    return env.ASSETS.fetch(request)
  },
}