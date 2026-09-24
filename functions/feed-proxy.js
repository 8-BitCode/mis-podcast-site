// functions/feed-proxy.js
//
// Proxies the Anchor.fm RSS feed server-side so the browser can fetch it
// without hitting the same CORS wall as the audio files.

const FEED_URL = 'https://anchor.fm/s/11798adb0/podcast/rss'

export async function onRequest() {
  const upstream = await fetch(FEED_URL, { redirect: 'follow' })

  const headers = new Headers(upstream.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Content-Type', 'application/xml; charset=utf-8')

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}