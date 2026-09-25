import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '../lib/site.js'
import { useDocumentHead } from '../hooks/useDocumentHead.js'
import { usePageFx } from '../hooks/useFx.js'

const ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]

// Mirrors worker/index.js's MAX_FILE_BYTES so the browser can reject an
// oversized file instantly instead of uploading 500MB just to be told no.
const MAX_FILE_BYTES = 500 * 1024 * 1024

export default function UploadPage() {
  const [passphrase, setPassphrase] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const formRef = useRef(null)

  useDocumentHead({ title: `Upload // ${SITE.name}`, description: 'File a new episode.', noindex: true })
  usePageFx([])

  const reset = () => {
    setTitle('')
    setDescription('')
    setFile(null)
    setProgress(0)
    if (formRef.current) formRef.current.reset()
  }

  const submit = (e) => {
    e.preventDefault()
    setError('')

    if (!passphrase) return setError('Passphrase required.')
    if (!title.trim()) return setError('Title required.')
    if (!file) return setError('Choose an audio file.')
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return setError(`Unsupported file type: ${file.type || 'unknown'}. Use MP3, WAV or M4A.`)
    }
    if (file.size > MAX_FILE_BYTES) {
      return setError(`File too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB).`)
    }

    const fd = new FormData()
    fd.set('passphrase', passphrase)
    fd.set('title', title.trim())
    fd.set('description', description.trim())
    fd.set('audio', file)

    // XHR (not fetch) so we get upload progress for a multi-hour episode file.
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
    }
    xhr.onload = () => {
      let body = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) {
        setStatus('done')
        reset()
      } else {
        setStatus('error')
        setError(body.error || `Upload failed (${xhr.status}).`)
      }
    }
    xhr.onerror = () => {
      setStatus('error')
      setError('Network error during upload.')
    }
    xhr.send(fd)
    setStatus('uploading')
  }

  return (
    <div className="article-page">
      <Link className="back-link" to="/">
        &lt; ALL EPISODES
      </Link>

      <header className="dossier ascii-box">
        <span className="ascii-corner tl" aria-hidden="true">+</span>
        <span className="ascii-corner tr" aria-hidden="true">+</span>
        <span className="ascii-corner bl" aria-hidden="true">+</span>
        <span className="ascii-corner br" aria-hidden="true">+</span>

        <div className="dossier-top">
          <span className="dossier-file">~/dispatches/upload.sys</span>
          <span className="stamp" aria-label="Restricted">
            RESTRICTED
          </span>
        </div>

        <h1 className="dossier-title">File a new episode</h1>
        <p className="mast-sub">Members only — you'll need the shared passphrase.</p>
      </header>

      <form ref={formRef} className="upload-form ascii-box" onSubmit={submit}>
        <label className="upload-field">
          <span>PASSPHRASE</span>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="off"
            required
          />
        </label>

        <label className="upload-field">
          <span>TITLE</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="upload-field">
          <span>DESCRIPTION</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label className="upload-field">
          <span>AUDIO FILE</span>
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          {file && (
            <span className="upload-file-meta">
              {file.name} — {(file.size / (1024 * 1024)).toFixed(1)}MB
            </span>
          )}
        </label>

        {status === 'uploading' && (
          <div className="upload-progress" role="status">
            <span className="upload-progress-bar">
              <i style={{ width: `${progress}%` }} />
            </span>
            <span>{progress}%</span>
          </div>
        )}

        {error && <p className="upload-error" role="alert">{error}</p>}
        {status === 'done' && <p className="upload-success">Filed. It'll appear on the homepage within a minute.</p>}

        <button type="submit" className="btn btn-solid" disabled={status === 'uploading'}>
          {status === 'uploading' ? 'UPLOADING…' : 'SUBMIT EPISODE'}
        </button>
      </form>
    </div>
  )
}