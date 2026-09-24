import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getPosts } from '../lib/episodes.js'
import { rankSuggestions } from '../lib/fx.js'
import { SITE } from '../lib/site.js'
import { useDocumentHead } from '../hooks/useDocumentHead.js'
import { usePageFx } from '../hooks/useFx.js'

export default function NotFoundPage() {
  const [posts, setPosts] = useState([])
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    getPosts().then((p) => {
      if (!cancelled) setPosts(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useDocumentHead({ title: `File not found // ${SITE.name}`, description: "That address doesn't lead to an episode.", noindex: true })
  usePageFx([posts.length])

  const matches = useMemo(() => rankSuggestions(pathname, posts), [pathname, posts])
  const showingMatches = matches.length > 0
  const latest = showingMatches ? matches : posts.slice(0, 3)

  return (
    <section className="lost">
      <div className="titlebar">
        <span className="titlebar-path">
          ~/dispatches/<span data-path-short>unknown</span>
        </span>
        <span className="titlebar-rule" aria-hidden="true"></span>
        <span className="titlebar-flag titlebar-flag--bad">ERROR 404</span>
      </div>

      <div className="lost-grid">
        <div className="radar" role="img" aria-label="Radar sweep with no signal found">
          <span className="radar-sweep"></span>
          <span className="radar-blip"></span>
          <span className="radar-label">NO SIGNAL</span>
        </div>

        <div className="lost-copy">
          <p className="lost-code" aria-hidden="true">
            <span data-decrypt="mount" data-delay="100">
              404
            </span>
          </p>
          <h1 className="lost-title">File not found</h1>
          <p className="lost-text">
            That address doesn't lead to an episode. It may have been renamed or removed, or the link has a typo.
          </p>

          <div className="term" data-terminal aria-hidden="true">
            <p className="term-line" style={{ '--i': 0 }}>
              <span className="term-key">REQUEST</span>
              <span className="term-val" data-path>
                /unknown
              </span>
            </p>
            <p className="term-line" style={{ '--i': 1 }}>
              <span className="term-key">ARCHIVE</span>
              <span className="term-val">search complete</span>
            </p>
            <p className="term-line" style={{ '--i': 2 }}>
              <span className="term-key">RESULT</span>
              <span className="term-val term-val--bad">NO EXACT MATCH</span>
            </p>
          </div>

          <div className="suggest" data-suggest>
            {latest.length > 0 && (
              <>
                <p className="suggest-title" data-suggest-title>
                  {showingMatches ? 'DID YOU MEAN' : 'LATEST EPISODES'}
                </p>
                <ul className="suggest-list" data-suggest-list>
                  {latest.map((p) => (
                    <li key={p.slug}>
                      <Link to={`/${p.slug}`}>
                        <b>EP {p.fileNo}</b>
                        <span>{p.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="lost-actions">
            <Link className="btn btn-solid" to="/">
              All episodes
            </Link>
            <a className="btn" href={SITE.mainUrl}>
              Main site
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
