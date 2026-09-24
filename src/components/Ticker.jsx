import { Link } from 'react-router-dom'

/** Scrolling wire of the latest files. Two identical halves so the loop is seamless. */
export default function Ticker({ posts = [] }) {
  const repeat = Math.max(1, Math.ceil(6 / Math.max(posts.length, 1)))
  const run = Array.from({ length: repeat }, () => posts).flat()

  return (
    <div className="ticker" role="region" aria-label="Latest episodes">
      <div className="ticker-track">
        {[0, 1].map((half) => (
          <div className="ticker-half" aria-hidden={half === 1 ? 'true' : undefined} key={half}>
            {run.map((p, i) => (
              <Link
                className="ticker-item"
                to={`/${p.slug}`}
                tabIndex={half === 1 ? -1 : undefined}
                key={`${p.slug}-${i}`}
              >
                <b>EP {p.fileNo}</b>
                <span>{p.title}</span>
                <i aria-hidden="true">//</i>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
