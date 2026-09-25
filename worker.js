// worker.js
//
// Cloudflare Worker entry point for the MIS Dispatches podcast site.
// Handles three API routes, then falls back to serving the built React
// app (via the ASSETS binding) for everything else.
//
//   POST /api/upload   -> accepts a passphrase-protected episode upload,
//                         stores the audio in R2, writes metadata to KV
//   GET  /feed-proxy    -> generates a standard podcast RSS feed from KV
//                         (kept at this path so src/lib/episodes.js needs
//                         zero changes)
//   GET  /audio/:key    -> streams an episode's audio from R2, with
//                         byte-range support for seeking/scrubbing
//
// Required bindings (set these in wrangler.toml so they survive deploys,
// not just in the dashboard):
//   [[r2_buckets]]
//   binding = "AUDIO_BUCKET"
//   bucket_name = "mis-podcast-audio"
//
//   [[kv_namespaces]]
//   binding = "EPISODES"
//   id = "<your KV namespace id>"
//
// Required secret (set via `wrangler secret put UPLOAD_PASSPHRASE`,
// or the dashboard's "Runtime variables and secrets" section):
//   UPLOAD_PASSPHRASE

const MAX_FILE_BYTES = 500 * 1024 * 1024 // 500MB per episode
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    try {
      if (url.pathname === '/api/upload' && request.method === 'POST') {
        return await handleUpload(request, env)
      }

      if (url.pathname === '/feed-proxy' && request.method === 'GET') {
        return await handleFeed(env, url)
      }

      if (url.pathname.startsWith('/audio/') && request.method === 'GET') {
        return await handleAudio(request, env, url)
      }
    } catch (err) {
      console.error('[worker] unhandled error', err)
      return json({ error: 'Internal error' }, 500)
    }

    // Everything else: serve the built static site.
    return env.ASSETS.fetch(request)
  },
}

async function handleUpload(request, env) {
  if (!env.UPLOAD_PASSPHRASE) {
    return json({ error: 'Server is missing UPLOAD_PASSPHRASE configuration' }, 500)
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Expected multipart/form-data' }, 400)
  }

  const passphrase = form.get('passphrase')
  if (!passphrase || passphrase !== env.UPLOAD_PASSPHRASE) {
    return json({ error: 'Incorrect passphrase' }, 401)
  }

  const title = (form.get('title') || '').toString().trim()
  const description = (form.get('description') || '').toString().trim()
  const file = form.get('audio')

  if (!title) return json({ error: 'Title is required' }, 400)
  if (!(file instanceof File)) return json({ error: 'No audio file received' }, 400)
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return json({ error: `Unsupported file type: ${file.type || 'unknown'}` }, 400)
  }
  if (file.size > MAX_FILE_BYTES) {
    return json({ error: `File too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB)` }, 400)
  }

  const id = crypto.randomUUID()
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase()
  const key = `${id}.${ext}`

  await env.AUDIO_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  const publishedAt = new Date().toISOString()
  const record = {
    id,
    title,
    description,
    audioKey: key,
    audioType: file.type,
    fileSize: file.size,
    publishedAt,
  }

  await env.EPISODES.put(`episode:${id}`, JSON.stringify(record))

  return json({ ok: true, episode: record })
}

async function handleFeed(env, requestUrl) {
  const list = await env.EPISODES.list({ prefix: 'episode:' })
  const episodes = []

  for (const key of list.keys) {
    const raw = await env.EPISODES.get(key.name)
    if (raw) episodes.push(JSON.parse(raw))
  }

  episodes.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  const items = episodes
    .map((ep) => {
      const audioUrl = `${requestUrl.origin}/audio/${encodeURIComponent(ep.audioKey)}`
      return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(ep.description || '')}</description>
      <pubDate>${new Date(ep.publishedAt).toUTCString()}</pubDate>
      <guid isPermaLink="false">${ep.id}</guid>
      <enclosure url="${audioUrl}" type="${ep.audioType}" length="${ep.fileSize}" />
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DISPATCHES</title>
    <description>A podcast of reports, briefings and field recordings from the Manchester Intelligence Society.</description>${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}

async function handleAudio(request, env, url) {
  const key = decodeURIComponent(url.pathname.replace('/audio/', ''))
  const rangeHeader = request.headers.get('Range')

  let getOptions
  const match = rangeHeader && /bytes=(\d+)-(\d*)/.exec(rangeHeader)
  if (match) {
    const offset = Number(match[1])
    const length = match[2] ? Number(match[2]) - offset + 1 : undefined
    getOptions = { range: length ? { offset, length } : { offset } }
  }

  const object = getOptions ? await env.AUDIO_BUCKET.get(key, getOptions) : await env.AUDIO_BUCKET.get(key)
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('accept-ranges', 'bytes')
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-headers', 'Range')
  headers.set('access-control-expose-headers', 'Content-Length, Content-Range, Accept-Ranges')

  if (object.range) {
    const totalSize = object.size
    const start = object.range.offset ?? 0
    const end = start + (object.range.length ?? totalSize - start) - 1
    headers.set('content-range', `bytes ${start}-${end}/${totalSize}`)
    return new Response(object.body, { status: 206, headers })
  }

  return new Response(object.body, { status: 200, headers })
}

function escapeXml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}