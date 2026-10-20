import { useCallback, useEffect, useRef, useState } from 'react'
import { Archive, ArrowCounterClockwise, Check, Heart, Pause, Play, SkipForward } from '@phosphor-icons/react'
import { setFlag, type Flag, type Project } from './data'
import { Pebble, STONE, useCountUp } from './Brand'
import { Ring } from './Ring'
import { VolumeControl } from './Volume'
import { clock, mmss, play, progress, seek, stop, toggle, usePlayer } from './player'

type Result = 'keep' | 'finish' | 'bin' | 'skip'
const ACTIONS: { id: Result; label: string; hint: string; flag: Flag | null; Icon: typeof Heart }[] = [
  { id: 'bin', label: 'Bin', hint: 'Hide this project from your library', flag: 'bin', Icon: Archive },
  { id: 'keep', label: 'Keep', hint: 'Save it to come back to', flag: 'keep', Icon: Heart },
  { id: 'finish', label: 'Finish', hint: 'Mark it as ready to finish', flag: 'finish', Icon: Check },
  { id: 'skip', label: 'Skip', hint: 'Decide later', flag: null, Icon: SkipForward },
]
const RESULT_LABEL: Record<Result, string> = { keep: 'Kept', finish: 'Finished', bin: 'Binned', skip: 'Skipped' }
const RESULT_ICON = { keep: Heart, finish: Check, bin: Archive, skip: SkipForward }

function Tally({ n, label }: { n: number; label: string }) {
  const v = useCountUp(n, 800)
  return <div><b>{v}</b><span>{label}</span></div>
}

function Bars() {
  return <span className="eq" aria-hidden><i /><i /><i /></span>
}

export function Listen({ queue, onMore, onLibrary }: { queue: Project[]; onMore: () => void; onLibrary: () => void }) {
  const [i, setI] = useState(0)
  const [results, setResults] = useState<Record<number, Result>>({})
  const [summary, setSummary] = useState(false)
  const { id, playing, duration, loading, error, ended } = usePlayer()
  const cur = queue[i]
  const range = useRef<HTMLInputElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  const decided = Object.keys(results).length

  // start whichever track is selected, whether it came from "next" or from tapping the queue
  useEffect(() => {
    if (!summary && cur?.audio) play({ id: cur.id, audio: cur.audio })
  }, [cur, summary])
  useEffect(() => () => stop(), [])
  useEffect(() => { if (summary) stop() }, [summary])

  useEffect(() => {
    if (!cur) return
    let raf = 0
    const tick = () => {
      const r = progress(cur.id)
      if (range.current) { range.current.value = String(r * 1000); range.current.style.setProperty('--p', `${r * 100}%`) }
      if (time.current) time.current.textContent = clock(cur.id)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cur])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === ' ' && !summary && !['BUTTON', 'INPUT', 'SELECT', 'SUMMARY'].includes(document.activeElement?.tagName ?? '')) { e.preventDefault(); toggle() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [summary])

  const act = useCallback((a: (typeof ACTIONS)[number]) => {
    if (summary) return
    if (a.flag) setFlag(cur.id, a.flag)
    const next = { ...results, [i]: results[i] && a.id === 'skip' ? results[i] : a.id }
    setResults(next)
    // move to the next track you have not decided on yet, looking forward first
    const order = [...queue.keys()].map((_, n) => (i + 1 + n) % queue.length)
    const open = order.find((n) => !next[n])
    if (open === undefined) setSummary(true)
    else setI(open)
  }, [cur, i, queue, results, summary])

  const jump = (n: number) => { setSummary(false); setI(n) }
  const count = (r: Result) => Object.values(results).filter((x) => x === r).length
  const mine = !summary && id === cur.id
  const skipped = count('skip')

  return (
    <div className="listen">
      <section className="panel np" aria-label="Now playing" style={!summary ? { ['--wash' as string]: STONE[cur.stage] } : undefined}>
        {summary ? (
          <div className="npdone">
            <h1>That is {queue.length}.</h1>
            <div className="tally">
              <Tally n={count('finish')} label="finished" />
              <Tally n={count('keep')} label="kept" />
              <Tally n={count('bin')} label="binned" />
              {skipped > 0 && <Tally n={skipped} label="skipped" />}
            </div>
            <div className="nprow">
              <button className="npbtn solid" onClick={onMore}>Listen to five more</button>
              <button className="npbtn" onClick={onLibrary}>Back to library</button>
            </div>
          </div>
        ) : (
          <>
            <div className="nptop"><span>Now playing</span><div className="nright"><VolumeControl dark showDb /><span className="mono">{i + 1} of {queue.length}</span></div></div>
            <div className="ringwrap">
              <div className="ring">
                <Ring id={cur.id} />
                <button
                  className="bigplay"
                  onClick={() => (mine && !ended ? toggle() : play({ id: cur.id, audio: cur.audio! }))}
                  aria-label={mine && playing ? 'Pause' : ended && mine ? 'Play again' : 'Play'}
                >
                  {mine && playing ? <Pause weight="fill" size={32} /> : ended && mine ? <ArrowCounterClockwise weight="bold" size={32} /> : <Play weight="fill" size={32} />}
                </button>
              </div>
            </div>
            <div className="npname" key={cur.id} aria-live="polite">
              <h1>{cur.name}</h1>
              <p>{error && mine ? 'This audio file could not be played.' : `${cur.sessions} session${cur.sessions === 1 ? '' : 's'}, ${cur.stage}`}</p>
            </div>
            <div className="npscrub">
              <span ref={time} className="mono">0:00</span>
              <input ref={range} type="range" min={0} max={1000} defaultValue={0} aria-label="Playback position" onChange={(e) => seek(Number(e.target.value) / 1000)} />
              <span className="mono">{mine && loading ? '...' : mine && duration ? mmss(duration) : ''}</span>
            </div>
            <div className="nprow" role="group" aria-label="Decide about this project">
              {ACTIONS.map((a) => (
                <button key={a.id} className="npbtn" title={a.hint} onClick={() => act(a)}>
                  <a.Icon size={20} weight="light" aria-hidden /> {a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="panel upnext" aria-label="Queue">
        <div className="phead"><h2>Up next</h2><p>{decided} of {queue.length} decided. Tap a project to play it.</p></div>
        <ol>
          {queue.map((p, n) => {
            const r = results[n]
            const state = n === i && !summary ? 'now' : r ? 'done' : 'next'
            const RIcon = r ? RESULT_ICON[r] : null
            return (
              <li key={p.id}>
                <button className={`q ${state}`} onClick={() => jump(n)} aria-current={state === 'now' || undefined} aria-label={`${p.name}. ${r ? RESULT_LABEL[r] : state === 'now' ? 'Playing now' : 'Not decided yet'}`}>
                  <span className="qn">{state === 'now' && playing ? <Bars /> : RIcon && r !== 'skip' ? <RIcon size={16} weight="bold" aria-hidden /> : n + 1}</span>
                  <span className="qt">
                    <b>{p.name}</b>
                    <small><Pebble stage={p.stage} />{r ? RESULT_LABEL[r] : state === 'now' ? (playing ? 'Playing' : 'Paused') : `${p.sessions} session${p.sessions === 1 ? '' : 's'}`}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </aside>
    </div>
  )
}
