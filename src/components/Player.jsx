import { usePlayer } from '../context/PlayerContext.jsx'
import { fmtDuration, cx } from '../lib/format.js'
import Waveform from './Waveform.jsx'

export default function Player() {
  const p = usePlayer()
  if (!p.visible || !p.episode) return null

  const progress = p.duration ? p.currentTime / p.duration : 0

  return (
    <div className="player" data-player data-state={p.isPlaying ? 'playing' : 'paused'} data-loading={p.loading}>
      <div className="player-inner">
        <button type="button" className="player-playpause" onClick={p.toggle} aria-label="Play or pause" aria-busy={p.loading}>
          {p.loading ? (
            <span className="player-spinner" aria-hidden="true"></span>
          ) : p.isPlaying ? (
            <svg className="ppi-pause" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg className="ppi-play" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="player-wave" data-player-wave>
          <Waveform seed="player" bars={32} interactive label="LIVE FEED" progress={progress} onSeek={p.scrubToFraction} />
        </div>

        <div className="player-info">
          <span className="player-tag">EP {p.episode.fileNo}</span>
          <span className="player-title">{p.episode.title}</span>
        </div>

        <div className="player-time" aria-hidden="true">
          <span>{fmtDuration(p.currentTime)}</span>
          <span className="player-time-sep">/</span>
          <span>{p.duration ? fmtDuration(p.duration) : '--:--'}</span>
        </div>

        <div className="player-rate">
          <button type="button" className="player-rate-btn" onClick={p.cycleSpeed}>
            {p.speedLabel}
          </button>
        </div>

        <button type="button" className="player-close" onClick={p.close} aria-label="Close player">
          ×
        </button>
      </div>
      <div
        className={cx('player-scrub', { 'is-loading': p.loading })}
        role="slider"
        aria-label="Seek"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          p.scrubToFraction((e.clientX - rect.left) / rect.width)
        }}
      >
        <div className="player-scrub-fill" style={{ width: `${progress * 100}%` }}></div>
      </div>
    </div>
  )
}