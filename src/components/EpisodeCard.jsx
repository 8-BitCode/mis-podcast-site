import { Link } from 'react-router-dom'
import { fmtDate, fmtDuration, cx } from '../lib/format.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import Waveform from './Waveform.jsx'

export default function EpisodeCard({ post, lead = false }) {
  const search = `${post.title} ${post.author ?? ''} ${post.excerpt ?? ''}`.toLowerCase()
  const player = usePlayer()
  const isThis = player.episode?.slug === post.slug
  const progress = isThis && player.duration ? player.currentTime / player.duration : 0

  return (
    <article className={cx('ep-card', 'ascii-box', { 'is-lead': lead })} data-card data-search={search} data-decrypt-host>
      <span className="ascii-corner tl" aria-hidden="true">+</span>
      <span className="ascii-corner tr" aria-hidden="true">+</span>
      <span className="ascii-corner bl" aria-hidden="true">+</span>
      <span className="ascii-corner br" aria-hidden="true">+</span>

      <div className="ep-media">
        <button
          type="button"
          className={cx('ep-media-playbtn', { 'is-active': isThis && player.isPlaying && !player.loading, 'is-loading': isThis && player.loading })}
          aria-label={isThis && player.isPlaying ? `Pause episode ${post.fileNo}` : `Play episode ${post.fileNo}`}
          onClick={(e) => {
            e.preventDefault()
            player.play(post)
          }}
        >
          <Waveform
            seed={post.slug}
            bars={lead ? 64 : 32}
            interactive={isThis}
            progress={progress}
            onSeek={(f) => player.scrubToFraction(f)}
          />
        </button>
        <span className="ep-media-scan" aria-hidden="true"></span>
        <span className="ep-media-tag">EP {post.fileNo}</span>
      </div>

      <Link className="ep-card-link" to={`/${post.slug}`} aria-label={`Open episode ${post.fileNo}: ${post.title}`}>
        <span style={{ position: 'absolute', inset: 0, zIndex: 1 }} aria-hidden="true"></span>

        <div className="ep-body">
          <div className="ep-meta">
            <span>{fmtDate(post.publishedAt)}</span>
            <span>{post.duration ? fmtDuration(post.duration) : '--:--'}</span>
            {post.author && <span>{post.author.toUpperCase()}</span>}
          </div>
          <h2 className="ep-title">
            <span data-decrypt="hover">{post.title}</span>
          </h2>
          {post.excerpt && (
            <p className="ep-excerpt">
              <span className="redact" data-redact>
                {post.excerpt}
              </span>
            </p>
          )}
          <span className="ep-open" aria-hidden="true">
            SHOW NOTES &gt;
          </span>
        </div>
      </Link>
    </article>
  )
}