import { useEffect, useState } from 'react'
import EpisodeCard from '../components/EpisodeCard.jsx'
import Ticker from '../components/Ticker.jsx'
import { getPosts } from '../lib/episodes.js'
import { fmtDate } from '../lib/format.js'
import { SITE } from '../lib/site.js'
import { useDocumentHead } from '../hooks/useDocumentHead.js'
import { usePageFx } from '../hooks/useFx.js'

export default function HomePage() {
  const [posts, setPosts] = useState(null) // null = loading

  useEffect(() => {
    let cancelled = false
    getPosts().then((p) => {
      if (!cancelled) setPosts(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useDocumentHead({})
  usePageFx([posts?.length ?? 0])

  if (posts === null) {
    return (
      <section className="masthead">
        <p className="mast-sub">
          <span className="prompt">&gt;</span>RETRIEVING FEED
          <span className="cursor" aria-hidden="true"></span>
        </p>
      </section>
    )
  }

  const [lead, ...rest] = posts
  const showSearch = posts.length >= 6

  return (
    <>
      {posts.length > 0 && <Ticker posts={posts.slice(0, 8)} />}

      <section className="masthead">
        <div className="titlebar">
          <span className="titlebar-path">~/dispatches/index.sys</span>
          <span className="titlebar-rule" aria-hidden="true"></span>
          <span className="titlebar-flag">CLEARANCE: PUBLIC</span>
        </div>

        <h1 className="mast-title">
          <span className="prompt" aria-hidden="true">
            &gt;
          </span>
          <span data-decrypt="mount" data-delay="150">
            {SITE.name}
          </span>
          <span className="cursor" aria-hidden="true"></span>
        </h1>

        <p className="mast-sub">
          <span className="redact" data-redact>
            {SITE.tagline}
          </span>
        </p>

        {posts.length > 0 && (
          <dl className="mast-meta">
            <div>
              <dt>EPISODES</dt>
              <dd>{String(posts.length).padStart(3, '0')}</dd>
            </div>
            <div>
              <dt>LAST FILED</dt>
              <dd>{fmtDate(posts[0].publishedAt)}</dd>
            </div>
          </dl>
        )}

        {(SITE.applePodcastsUrl || SITE.spotifyUrl) && (
          <div className="mast-subscribe">
            {SITE.applePodcastsUrl && (
              <a className="btn" href={SITE.applePodcastsUrl}>
                Apple Podcasts
              </a>
            )}
            {SITE.spotifyUrl && (
              <a className="btn" href={SITE.spotifyUrl}>
                Spotify
              </a>
            )}
          </div>
        )}
      </section>

      {posts.length === 0 ? (
        <section className="feed">
          <div className="feed-empty-state ascii-box">
            <p className="feed-empty-title">Nothing filed yet.</p>
            <p className="feed-empty-text">
              The first episode will appear here once it's published. In the meantime, the main site has everything
              else.
            </p>
            <a className="btn btn-solid" href={SITE.mainUrl}>
              Visit the main site
            </a>
          </div>
        </section>
      ) : (
        <>
          <section className="feed" aria-labelledby="latest-h">
            <h2 className="feed-title" id="latest-h">
              <span className="prompt" aria-hidden="true">
                &gt;
              </span>
              <span data-decrypt="visible">LATEST EPISODE</span>
            </h2>
            <EpisodeCard post={lead} lead />
          </section>

          {rest.length > 0 && (
            <section className="feed" aria-labelledby="archive-h">
              <div className="feed-head">
                <h2 className="feed-title" id="archive-h">
                  <span className="prompt" aria-hidden="true">
                    &gt;
                  </span>
                  <span data-decrypt="visible">ARCHIVE</span>
                </h2>
                {showSearch && (
                  <div className="search">
                    <label className="search-box">
                      <span className="search-prompt" aria-hidden="true">
                        &gt;
                      </span>
                      <span className="sr-only">Search episodes</span>
                      <input type="search" data-search placeholder="search episodes" autoComplete="off" spellCheck="false" />
                    </label>
                    <span className="search-count" data-search-count aria-live="polite">
                      {posts.length} EPISODES
                    </span>
                  </div>
                )}
              </div>
              <div className="grid">
                {rest.map((p) => (
                  <EpisodeCard post={p} key={p.slug} />
                ))}
              </div>
              <p className="feed-empty" data-search-empty hidden>
                No episode matches that search. Clear the box to see every episode.
              </p>
            </section>
          )}
        </>
      )}
    </>
  )
}