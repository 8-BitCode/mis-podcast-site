// src/components/RealWaveform.jsx
import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { fmtDuration, cx } from '../lib/format.js'

/**
 * Page-scoped real waveform. Deliberately not global: playback lives and
 * dies with this page, on purpose — leaving the episode stops it, same as
 * any other embedded player (separate from the site-wide Player bar).
 *
 * The audio URL is expected to already be routed through /audio-proxy
 * (see src/lib/episodes.js), so WaveSurfer's fetch succeeds and it can
 * decode the real peaks. If decoding still fails, a native <audio> control
 * takes over so the episode is never unplayable.
 *
 * Layout is play | waveform | time in one row (see react-additions.css),
 * with the waveform mount sized explicitly so WaveSurfer's height:'auto'
 * centres the bars in the panel.
 */
export default function RealWaveform({ slug, src, title, fileNo }) {
  const { audioRef } = usePlayer() // site-wide player: paused when this one starts
  const waveElRef = useRef(null)
  const wsRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loadPct, setLoadPct] = useState(0) // download progress, 0-100
  const [tries, setTries] = useState(0) // bumped by the manual "Retry waveform" button

  useEffect(() => {
    if (!src || !waveElRef.current) return

    setReady(false)
    setFailed(false)
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
    setLoadPct(0)

    const style = getComputedStyle(document.documentElement)
    const accent = style.getPropertyValue('--accent').trim() || '#39d2ff'
    const idle = style.getPropertyValue('--wf-idle').trim() || '#2b5361'

    // `disposed` guards against events from an instance that has already been
    // torn down (leaving the page, StrictMode's double mount, switching
    // episodes). Destroying WaveSurfer mid-download raises an AbortError that
    // used to be mistaken for a real failure and swapped in the native player.
    let disposed = false
    let retryTimer = 0

    const mount = (attempt) => {
      const ws = WaveSurfer.create({
        container: waveElRef.current,
        height: 'auto',
        waveColor: idle,
        progressColor: accent,
        cursorColor: accent,
        cursorWidth: 2,
        barWidth: 3,
        barGap: 2,
        barRadius: 2,
        dragToSeek: true,
        normalize: true,
        url: src,
      })
      wsRef.current = ws

      ws.on('play', () => {
        audioRef.current?.pause()
        setPlaying(true)
      })
      ws.on('pause', () => setPlaying(false))
      ws.on('finish', () => setPlaying(false))
      ws.on('timeupdate', (t) => setCurrent(t))
      ws.on('loading', (pct) => {
        if (!disposed) setLoadPct(pct)
      })
      ws.on('ready', (dur) => {
        if (disposed) return
        setDuration(dur)
        setReady(true)
      })
      ws.on('error', (e) => {
        if (disposed || e?.name === 'AbortError') return
        console.error(`[RealWaveform] WaveSurfer error (attempt ${attempt + 1})`, e)
        if (attempt === 0) {
          // One quiet retry: a cold proxy or a dropped connection usually clears.
          retryTimer = setTimeout(() => {
            if (disposed) return
            try {
              ws.destroy()
            } catch {
              /* already gone */
            }
            mount(1)
          }, 700)
          return
        }
        setFailed(true)
      })
    }

    mount(0)

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      try {
        wsRef.current?.destroy()
      } catch {
        /* already gone */
      }
      wsRef.current = null
    }
  }, [slug, src, audioRef, tries])

  return (
    <div className={cx('rwave', { 'is-ready': ready, 'is-playing': playing, 'is-failed': failed })} data-rwave data-slug={slug}>
      {!failed && (
        <button
          type="button"
          className={cx('episode-player-play', { 'is-playing': playing })}
          onClick={() => wsRef.current?.playPause()}
          disabled={!ready}
          aria-label={`${playing ? 'Pause' : 'Play'} episode ${fileNo}: ${title}`}
        >
          <svg className="ep-play-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg className="ep-pause-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        </button>
      )}

      <div className="rwave-stage">
        <div className="rwave-wave" ref={waveElRef} />
        {!ready && !failed && (
          <div className="rwave-status" role="status">
            <p>
              {loadPct <= 0 ? 'CONNECTING' : loadPct < 100 ? `LOADING AUDIO ${Math.round(loadPct)}%` : 'DECODING SIGNAL'}
              <span className="cursor" aria-hidden="true"></span>
            </p>
            <span className={cx('rwave-bar', { 'is-indeterminate': loadPct <= 0 || loadPct >= 100 })} aria-hidden="true">
              <i style={{ width: `${loadPct}%` }}></i>
            </span>
          </div>
        )}
        {failed && (
          <>
            <audio controls preload="metadata" src={src} aria-label={`Episode ${fileNo}: ${title}`} />
            <button type="button" className="btn rwave-retry" onClick={() => setTries((t) => t + 1)}>
              Retry waveform
            </button>
          </>
        )}
      </div>

      {!failed && (
        <div className="episode-player-time" aria-hidden="true">
          <span>{fmtDuration(current)}</span>
          <span className="player-time-sep">/</span>
          <span>{ready ? fmtDuration(duration) : '--:--'}</span>
        </div>
      )}
    </div>
  )
}