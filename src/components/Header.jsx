import { Link, useLocation } from 'react-router-dom'
import { SITE } from '../lib/site.js'
import { cx } from '../lib/format.js'

export default function Header() {
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  return (
    <header className="site-header">
      <div className="header-bar">
        <Link className="brand" to="/" aria-label={`${SITE.short} ${SITE.name} — home`}>
          <span className="brand-dot" aria-hidden="true"></span>
          <span className="brand-code">{SITE.short}</span>
          <span className="brand-sub">{SITE.sub}</span>
        </Link>

        <nav className="header-links" aria-label="Primary">
          <Link className={cx('hlink', { 'is-active': onHome })} to="/" aria-current={onHome ? 'page' : undefined}>
            ALL EPISODES
          </Link>
          <a className="hlink" href={SITE.mainUrl}>
            MAIN SITE
          </a>
        </nav>

        <div className="header-status" aria-hidden="true">
          <span className="status-dot"></span>
          <span>FEED LIVE</span>
          <span className="clock" data-clock>--:--:--</span>
          <span className="read-pct" data-read-pct>0%</span>
        </div>

        <button type="button" className="sfx-toggle" data-sfx-toggle aria-pressed="true" title="Toggle interface sounds">
          SFX: ON
        </button>
      </div>
      <div className="read-progress" aria-hidden="true">
        <i></i>
      </div>
    </header>
  )
}
