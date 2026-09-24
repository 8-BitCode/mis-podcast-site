// functions/audio-proxy/[[path]].js
//
// Server-side proxy for podcast audio. Anchor.fm (and the CloudFront URLs it
// redirects to) never send Access-Control-Allow-Origin, so the browser blocks
// WaveSurfer's fetch() when it tries to decode the file for waveform peaks.
//
// A Pages Function runs on Cloudflare's edge, not in the browser, so CORS
// doesn't apply to the outbound request. We fetch upstream, then re-serve the
// response with the CORS headers the browser needs. Range requests are
// forwarded so seeking within WaveSurfer still works (no full re-download
// when you scrub).

export async function onRequest(context) {
  const { request } = context
  // Use the raw request path, not params.path: the audio URLs contain
  // percent-encoded slashes (%2F) that must reach Anchor exactly as sent,
  // which is also what the Vite dev proxy does. Decoded params could differ.
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/audio-proxy/, '')
  const targetUrl = `https://anchor.fm${path}${url.search}`

  // Forward Range if present — WaveSurfer uses it for seeking.
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

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}