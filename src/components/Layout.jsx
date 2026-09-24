import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import Player from './Player.jsx'
import { useGlobalFx } from '../hooks/useFx.js'

export default function Layout() {
  useGlobalFx()

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="bg" aria-hidden="true">
        <div className="bg-glow"></div>
        <canvas className="bg-net"></canvas>
      </div>
      <div className="noise" aria-hidden="true"></div>
      <div className="reticle" aria-hidden="true">
        <span className="xhair-x"></span>
        <span className="xhair-y"></span>
        <span className="xhair-box"></span>
      </div>

      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <Player />
    </>
  )
}
