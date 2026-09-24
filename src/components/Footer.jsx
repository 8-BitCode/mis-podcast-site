import { Link } from 'react-router-dom'
import { SITE } from '../lib/site.js'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-end">
          <span className="prompt">&gt;</span>END OF TRANSMISSION<span className="cursor" aria-hidden="true"></span>
        </p>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/">All episodes</Link>
          <a href={SITE.mainUrl}>Main site</a>
        </nav>
        <p className="footer-fine">© {year} Manchester Intelligence Society</p>
      </div>
    </footer>
  )
}