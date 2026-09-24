# DISPATCHES — React + Vite port

This is a conversion of the Astro site (Base/Header/Footer/EpisodeCard/
Ticker/Waveform/Player components, the index/episode/404 pages, fx.js,
player.js and global.css) to a client-rendered React + Vite single-page app.

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

## What changed, and why

**Routing.** Astro's file-based pages (`index.astro`, `[slug].astro`,
`404.astro`) became `react-router-dom` routes in `src/App.jsx`, rendered
inside `src/components/Layout.jsx` (the old `Base.astro`).

**Data fetching.** `getPosts()`/`getPostsFull()` used to run at *build
time*, server-side, in Astro — so the RSS fetch never hit CORS and the
regex-based parser only ever needed to survive a fixed, known feed shape.
In this SPA the fetch happens in the visitor's browser instead:

- `src/lib/episodes.js` now parses with `DOMParser` rather than regex
  (safe to do in a browser, and more robust).
- **CORS**: anchor.fm doesn't send `Access-Control-Allow-Origin`, so a
  direct browser fetch to the feed is blocked by the browser once this is
  deployed. `vite.config.js` proxies `/rss-proxy` to the real feed so
  `npm run dev` works out of the box. For production you have two options:
  1. Put a tiny serverless function in front of it that fetches the feed
     server-side and returns it (a Cloudflare Worker, Vercel/Netlify
     function, etc. — a few lines: `fetch` the real feed, return the body
     with the right content-type).
  2. Self-host a periodically-refreshed copy of the XML on the same origin.

  If the live feed can't be reached, the app falls back to the bundled
  `src/lib/rss_sample.xml` so it still renders something rather than a
  blank page — check the browser console for a warning when that happens.
- Pages fetch through `useEffect` + local state instead of Astro's
  top-level `await`, with a small "RETRIEVING FEED / FILE" loading state
  standing in for what used to just be there instantly on first paint.

**Client effects (fx.js).** Ported near-verbatim into `src/lib/fx.js`.
The only structural change is *when* it runs: Astro fired `initPage()` on
its `astro:page-load` transition event; here `src/hooks/useFx.js` calls
the same logic from a `useEffect` keyed on the route and on each page's
loaded data, and returns/cleans up the same way. `bootOnce()` (SFX,
cursor reticle, card spotlight, ambient canvas background) runs once from
`Layout`.

**The site-wide Player.** In Astro this needed `transition:persist` to
survive page swaps. In React, `<Player />` is mounted once in `Layout`,
*outside* `<Routes>`, so the same `<audio>` DOM node and its playback
state simply never unmount across navigation — no special persistence
mechanism needed.

**Per-episode waveform.** The inline WaveSurfer script in `[slug].astro`
(loaded from a CDN via `<script type="module">`) is now
`src/components/RealWaveform.jsx`, using `wavesurfer.js` as a normal npm
dependency, created/destroyed via `useEffect` (replacing the old
`astro:page-load` / `astro:before-swap` pair).

**A reconciled inconsistency.** `player.js` and `Player.astro` expect
elements tagged `data-play-src` / `data-play-slug` / `.ep-play` etc., but
the uploaded `EpisodeCard.astro` never rendered any such element — so the
site-wide player bar was unreachable in the source as given. This port
wires the card's waveform thumbnail to the player context so the bar is
actually usable, which seems to be the evident intent. Flagging this
since it's a small behavioural fill-in, not a pure 1:1 port of dead code.

**No CSS changes.** `src/styles/global.css` is byte-for-byte the uploaded
stylesheet. `src/styles/react-additions.css` only adds rules for things
that had **zero** CSS in the source: the site-wide Player bar (its
selectors — `.player-playpause`, `.player-wave`, `.player-scrub`, etc. —
had no matching rules at all in global.css) and a reset for the new card
play-button element.

## What's dropped or simplified

- `env.d.ts` (Astro's ambient types) — not applicable to Vite, removed.
- Astro's nav-loader overlay (shown during slow page-to-page fetches) —
  there's no equivalent "fetching the next page" moment in an SPA;
  dropped in favour of the simple inline loading states mentioned above.
- Open Graph / canonical-URL meta tags from `Base.astro` — this is a
  client-rendered SPA, so per-page `<meta>` tags written after mount
  won't be seen by crawlers or link-unfurlers anyway. If SEO/social
  previews matter, consider Vite's SSR mode or a static prerender step
  (e.g. `vite-plugin-ssr`, or Astro itself) rather than pure CSR.
- The `.player` bar doesn't add bottom padding to the page when visible,
  so it can slightly overlap the footer on short pages — a small CSS
  fix (padding-bottom on `body` toggled via a class) if it bothers you.

## Verified

`npm install && npm run build` completes cleanly with no errors.
