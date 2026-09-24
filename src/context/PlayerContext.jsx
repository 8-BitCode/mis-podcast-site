import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Site-wide episode player.
 *
 * In the Astro version this was one <audio> element living in Base.astro,
 * kept alive across page navigations with `transition:persist`. Here that
 * problem disappears for free: <Player /> is mounted once in App.jsx,
 * outside <Routes>, so React never unmounts it on route changes and the
 * same <audio> node (and its playback position) survives navigation
 * automatically.
 *
 * NOTE ON SOURCE FILES: the uploaded player.js expects card/list elements
 * tagged data-play-src / data-play-slug / data-play-title etc., but the
 * uploaded EpisodeCard.astro never renders any such element — only the
 * per-episode page had its own separate (page-scoped) WaveSurfer player.
 * That leaves the site-wide bar unreachable in the original snapshot. This
 * port wires EpisodeCard's thumbnail waveform up to this context (via
 * `play()`) so the bar is actually usable, which is the evident intent of
 * player.js/Player.astro. Flagging this since it's a small behavioural
 * fill-in rather than a 1:1 port of dead code.
 */

const SPEEDS = [1, 1.25, 1.5, 2, 0.75]

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const audioRef = useRef(null)
  const [episode, setEpisode] = useState(null) // { slug, title, fileNo, audioUrl }
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false) // buffering / waiting on the network

  const play = useCallback((ep) => {
    const audio = audioRef.current
    if (!audio || !ep?.audioUrl) return
    const isSame = episode?.slug === ep.slug
    if (!isSame) {
      audio.src = ep.audioUrl
      audio.currentTime = 0
      setEpisode(ep)
      setVisible(true)
      setDuration(0)
      setCurrentTime(0)
    }
    if (isSame && !audio.paused) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !episode) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [episode])

  const seekBy = useCallback((deltaSeconds) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + deltaSeconds))
  }, [])

  const scrubToFraction = useCallback((frac) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = Math.max(0, Math.min(1, frac)) * audio.duration
  }, [])

  const cycleSpeed = useCallback(() => {
    const audio = audioRef.current
    setSpeedIdx((i) => {
      const next = (i + 1) % SPEEDS.length
      if (audio) audio.playbackRate = SPEEDS[next]
      return next
    })
  }, [])

  const close = useCallback(() => {
    const audio = audioRef.current
    if (audio) audio.pause()
    setVisible(false)
    setLoading(false)
    setEpisode(null)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => {
      setIsPlaying(true)
      if (audio.readyState < 3) setLoading(true) // HAVE_FUTURE_DATA: not enough to play yet
    }
    const onPause = () => {
      setIsPlaying(false)
      setLoading(false)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setLoading(false)
    }
    const onWaiting = () => setLoading(true)
    const onReady = () => setLoading(false) // playing / canplay / error
    const onLoaded = () => setDuration(audio.duration || 0)
    const onTime = () => setCurrentTime(audio.currentTime || 0)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onReady)
    audio.addEventListener('canplay', onReady)
    audio.addEventListener('error', onReady)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onReady)
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('error', onReady)
    }
  }, [])

  const value = useMemo(
    () => ({
      audioRef,
      episode,
      isPlaying,
      currentTime,
      duration,
      speedLabel: `${SPEEDS[speedIdx]}×`,
      visible,
      loading,
      play,
      toggle,
      seekBy,
      scrubToFraction,
      cycleSpeed,
      close,
    }),
    [episode, isPlaying, currentTime, duration, speedIdx, visible, loading, play, toggle, seekBy, scrubToFraction, cycleSpeed, close],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="none" />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within <PlayerProvider>')
  return ctx
}