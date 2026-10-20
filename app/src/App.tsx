import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChartBar, Headphones, Pause, Play, SquaresFour, X } from '@phosphor-icons/react'
import { hideToast, useCrate, useDetails, useFlags, useLoudness, useStageOverrides, useToast, type Crate, type Flag, type Project } from './data'
import { detectStage } from './stage'
import { VolumeControl } from './Volume'
import { Mark } from './Brand'
import { CratePage } from './CratePage'
import { StatsPage } from './StatsPage'
import { Listen } from './Listen'
import { clock, mmss, progress, seek, setLoudness, stop, toggle, usePlayer } from './player'

type Page = 'library' | 'listen' | 'recap'
const NAV: { id: Page; label: string; Icon: typeof SquaresFour }[] = [
  { id: 'library', label: 'Library', Icon: SquaresFour },
  { id: 'listen', label: 'Listen', Icon: Headphones },
  { id: 'recap', label: 'Recap', Icon: ChartBar },
]

// Listening sessions are bounded: five at a time, from projects with audio you have not already sorted.
function pickQueue(crate: Crate, flags: Record<number, Flag>): Project[] {
  const pool = crate.projects.filter((p) => p.audio && !flags[p.id])
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 5)
}

// The player bar stays on every page except Listen, like Spotify, Apple Music and Suno.
function PlayerBar({ crate, onShow }: { crate: Crate; onShow: (id: number) => void }) {
  const { id, playing, duration, loading, error } = usePlayer()
  const range = useRef<HTMLInputElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (id === null) return
    let raf = 0
    const tick = () => {
      const r = progress(id)
      if (range.current) { range.current.value = String(r * 1000); range.current.style.setProperty('--p', `${r * 100}%`) }
      if (time.current) time.current.textContent = clock(id)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [id])
  const p = id === null ? null : crate.projects.find((x) => x.id === id)
  if (!p) return null
  return (
    <div className="playerbar" role="region" aria-label="Now playing">
      <button className="bname" onClick={() => onShow(p.id)} title="Show in library">
        <b>{p.name}</b>
        <small>{error ? 'Could not play this file' : loading ? 'Loading' : p.stage}</small>
      </button>
      <button className="roundplay sm" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause weight="fill" size={20} /> : <Play weight="fill" size={20} />}
      </button>
      <span ref={time} className="mono t">0:00</span>
      <input ref={range} type="range" min={0} max={1000} defaultValue={0} aria-label="Playback position" onChange={(e) => seek(Number(e.target.value) / 1000)} />
      <span className="mono t">{duration ? mmss(duration) : ''}</span>
      <VolumeControl />
      <button className="bclose" onClick={stop} aria-label="Stop and close player"><X size={16} /></button>
    </div>
  )
}

function Toast() {
  const t = useToast()
  if (!t) return null
  return (
    <div className="toastbar" role="status" aria-live="polite" key={t.id}>
      <span>{t.text}</span>
      {t.undo && <button onClick={t.undo}>Undo</button>}
      <button className="tx" onClick={hideToast} aria-label="Dismiss"><X size={16} /></button>
    </div>
  )
}

export default function App() {
  const { crate: raw, error } = useCrate()
  const flags = useFlags()
  const [details, detailsReady] = useDetails()
  const overrides = useStageOverrides()
  const loud = useLoudness()

  // Stage comes from evidence in the project file, unless you set it yourself.
  const crate = useMemo<Crate | null>(() => {
    if (!raw || !detailsReady) return null
    return {
      ...raw,
      projects: raw.projects.map((p) => {
        const v = detectStage(p, details[p.folder])
        const o = overrides[p.folder]
        return { ...p, stage: o ?? v.stage, detected: v.stage, reasons: v.reasons, estimated: v.estimated, overridden: !!o }
      }),
    }
  }, [raw, details, detailsReady, overrides])

  // measured loudness lets the player even out loud and quiet tracks
  useEffect(() => {
    if (!raw) return
    const m: Record<number, { lufs: number; peak: number }> = {}
    raw.projects.forEach((p) => { if (loud[p.folder]) m[p.id] = loud[p.folder] })
    setLoudness(m)
  }, [raw, loud])
  const [page, setPage] = useState<Page>('library')
  const [session, setSession] = useState<{ id: number; queue: Project[] } | null>(null)
  const [focus, setFocus] = useState<{ id: number; n: number } | null>(null)

  const listen = useCallback(() => {
    if (!crate) return
    const queue = pickQueue(crate, flags)
    if (queue.length) setSession({ id: Date.now(), queue })
    setPage('listen')
  }, [crate, flags])

  const go = (p: Page) => (p === 'listen' ? (session ? setPage('listen') : listen()) : setPage(p))
  const show = (id: number) => { setPage('library'); setFocus({ id, n: Date.now() }) }

  return (
    <>
      <a className="skip" href="#content">Skip to content</a>
      <div className="app">
        <nav className="rail" aria-label="Main">
          <Mark size={44} />
          <div className="items">
            {NAV.map(({ id, label, Icon }) => (
              <button key={id} data-tip={label} aria-label={label} aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>
                <Icon size={24} weight="light" aria-hidden />
              </button>
            ))}
          </div>
        </nav>

        <div className="col">
          <main id="content" tabIndex={-1}>
            {error && <p className="empty pad">The crate could not be loaded ({error}). Is crate.json next to the app folder?</p>}
            {!crate && !error && (
              <div className="lib" aria-busy="true" aria-label="Loading your crate">
                <div className="panel skeleton" /><div className="panel skeleton" /><div className="panel skeleton" />
              </div>
            )}
            {crate && page === 'library' && <CratePage crate={crate} flags={flags} details={details} onListen={listen} focus={focus} />}
            {crate && page === 'listen' && session && (
              <Listen key={session.id} queue={session.queue} onMore={listen} onLibrary={() => setPage('library')} />
            )}
            {crate && page === 'listen' && !session && <p className="empty pad">Everything with audio has been sorted. Nice work.</p>}
            {crate && page === 'recap' && <StatsPage crate={crate} onListen={listen} />}
          </main>
          {crate && page !== 'listen' && <PlayerBar crate={crate} onShow={show} />}
        </div>
      </div>
      <Toast />
    </>
  )
}
