import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPostsFull } from '../lib/episodes.js'
import { fmtDate, fmtDuration, injectHeadingIds, cx } from '../lib/format.js'
import { SITE } from '../lib/site.js'
import { useDocumentHead } from '../hooks/useDocumentHead.js'
import { usePageFx } from '../hooks/useFx.js'
import RealWaveform from '../components/RealWaveform.jsx'
import NotFoundPage from './NotFoundPage.jsx'

export default function EpisodePage() {
  const { slug } = useParams()
  const [state, setState] = useState(null) // null = loading, or { post, newer, older }

  useEffect(() => {
    let cancelled = false
    getPostsFull().then((posts) => {
      if (cancelled) return
      const i = posts.findIndex((p) => p.slug === slug)
      if (i === -1) {
        setState({ notFound: true })
        return
      }
      setState({
        post: posts[i],
        newer: i > 0 ? posts[i - 1] : null,
        older: i < posts.length - 1 ? posts[i + 1] : null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const post = state && !state.notFound ? state.post : null
  const { html, headings } = post ? injectHeadingIds(post.notesHtml ?? '') : { html: '', headings: [] }
  const showToc = headings.length >= 3
  const description = post?.excerpt || SITE.tagline

  useDocumentHead(post ? { title: `${post.title} // ${SITE.name}`, description } : {})
  usePageFx([post?.slug])

  if (state === null) {
    return (
      <div className="article-page">
        <p className="mast-sub">
          <span className="prompt">&gt;</span>RETRIEVING FILE
          <span className="cursor" aria-hidden="true"></span>
        </p>
      </div>
    )
  }

  if (state.notFound) return <NotFoundPage />

  const { newer, older } = state
  const hasAudio = Boolean(post.audioUrl)

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
          <span className="dossier-file">~/dispatches/ep-{post.fileNo}</span>
          <span className="stamp" aria-label="Declassified">
            DECLASSIFIED
          </span>
        </div>

        <h1 className="dossier-title">{post.title}</h1>

        <dl className="dossier-meta">
          <div>
            <dt>EPISODE</dt>
            <dd>
              <span data-decrypt="mount" data-delay="500">
                {post.fileNo}
              </span>
            </dd>
          </div>
          <div>
            <dt>FILED</dt>
            <dd>
              <span data-decrypt="mount" data-delay="650">
                {fmtDate(post.publishedAt)}
              </span>
            </dd>
          </div>
          {post.author && (
            <div>
              <dt>HOST</dt>
              <dd>
                <span data-decrypt="mount" data-delay="800">
                  {post.author.toUpperCase()}
                </span>
              </dd>
            </div>
          )}
          <div>
            <dt>DURATION</dt>
            <dd>
              <span data-decrypt="mount" data-delay="950">
                {post.duration ? fmtDuration(post.duration) : '--:--'}
              </span>
            </dd>
          </div>
        </dl>
      </header>

      <div className="episode-player ascii-box">
        <div className="episode-player-wave">
          {hasAudio ? (
            <RealWaveform slug={post.slug} src={post.audioUrl} title={post.title} fileNo={post.fileNo} />
          ) : (
            <p className="episode-player-missing">Audio not yet filed for this episode.</p>
          )}
        </div>
      </div>

      <div className={cx('article-grid', { 'has-toc': showToc })}>
        {showToc && (
          <nav className="toc" aria-label="Contents">
            <p className="toc-title">TIMESTAMPS</p>
            <ol>
              {headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} data-toc-link className={cx({ 'is-sub': h.level === 3 })}>
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="article-main">
          <p className="prose-kicker">SHOW NOTES</p>
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="article-end">
            <p className="article-end-line">
              <span className="prompt" aria-hidden="true">
                &gt;
              </span>
              END OF FILE {post.fileNo}
            </p>
            <button type="button" className="btn" data-copy>
              <span data-copy-label>COPY LINK</span>
            </button>
          </div>
        </div>
      </div>

      {(newer || older) && (
        <nav className="adjacent" aria-label="More episodes">
          {older ? (
            <Link className="adjacent-link ascii-box" to={`/${older.slug}`}>
              <span className="adjacent-dir">&lt; OLDER EPISODE {older.fileNo}</span>
              <span className="adjacent-title">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link className="adjacent-link adjacent-link--next ascii-box" to={`/${newer.slug}`}>
              <span className="adjacent-dir">NEWER EPISODE {newer.fileNo} &gt;</span>
              <span className="adjacent-title">{newer.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}
