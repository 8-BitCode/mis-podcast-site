import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { bootOnce, initPage } from '../lib/fx.js'

/** Call once, at the app root. Equivalent to fx.js's bootOnce(). */
export function useGlobalFx() {
  useEffect(() => {
    bootOnce()
  }, [])
}

/**
 * Call once per page component, after its content (including any
 * async-loaded episode data) is in the DOM. Equivalent to the old
 * astro:page-load -> initPage() / astro:before-swap -> cleanup pair.
 *
 * `deps` should include whatever makes this page's *content* change (e.g.
 * the loaded post list, or the current post) so decrypt/redact/search
 * re-arm correctly when data arrives after the route itself has settled.
 */
export function usePageFx(deps = []) {
  const { pathname } = useLocation()
  useEffect(() => {
    const cleanup = initPage()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, ...deps])
}
