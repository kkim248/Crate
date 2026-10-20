import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, CalendarBlank, Check, CaretDown, Clock, FolderOpen, Heart, Headphones, ListMagnifyingGlass, MagnifyingGlass, Pause, Play, SlidersHorizontal, Repeat, SpeakerHigh, SpeakerSlash, Stack, TextAa, X,
} from '@phosphor-icons/react'
import { STAGES, hideToast, reveal, setFlag, showToast, type Crate, type Details, type Flag, type Project } from './data'
import { Inspector } from './Inspector'
import { StageGuide, StageMenu } from './StageMenu'
import { Pebble, STONE } from './Brand'
import { MiniRing } from './Ring'
import { play, toggle, usePlayer } from './player'

type Heard = 'all' | 'playable' | 'noaudio'
type Triage = 'active' | 'unreviewed' | Flag
type Sort = 'recent' | 'started' | 'sessions' | 'name'

const SORTS: { id: Sort; label: string; hint: string; Icon: typeof Clock }[] = [
  { id: 'recent', label: 'Recently opened', hint: 'By last autosave, newest first', Icon: Clock },
  { id: 'started', label: 'Date started', hint: 'By first autosave, oldest first', Icon: CalendarBlank },
  { id: 'sessions', label: 'Most reopened', hint: 'Highest session count first', Icon: Repeat },
  { id: 'name', label: 'A to Z', hint: 'By project name', Icon: TextAa },
]
const FLAGS: { id: Flag; label: string; Icon: typeof Heart }[] = [
  { id: 'keep', label: 'Keep', Icon: Heart },
  { id: 'finish', label: 'Finish', Icon: Check },
  { id: 'bin', label: 'Bin', Icon: Archive },
]

const LABEL: Record<Flag, string> = { keep: 'Kept', finish: 'Finished', bin: 'Binned' }
const plural = (c: number, w: string) => `${c} ${w}${c === 1 ? '' : 's'}`
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null)
const monthOf = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'long' }) : 'Undated')
const load = <T extends string>(k: string, d: T): T => { try { return (localStorage.getItem(k) as T) || d } catch { return d } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

function FilterRow({ label, count, on, onClick, Icon, stage }: { label: string; count: number; on: boolean; onClick: () => void; Icon?: typeof Stack; stage?: string }) {
  return (
    <button className="frow" aria-pressed={on} onClick={onClick}>
      {Icon && <Icon size={20} weight="light" aria-hidden />}
      {stage && <Pebble stage={stage} />}
      <span className="lbl">{label}</span>
      <span className="count">{count}</span>
    </button>
  )
}

function SortMenu({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const cur = SORTS.find((x) => x.id === value)!

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', away)
    wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  const key = (e: React.KeyboardEvent) => {
    const items = [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') { setOpen(false); wrap.current?.querySelector<HTMLElement>('.sortbtn')?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(at + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(at - 1 + items.length) % items.length]?.focus() }
  }

  return (
    <div className="sortwrap" ref={wrap} onKeyDown={key}>
      <button className="sortbtn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <cur.Icon size={20} weight="light" aria-hidden />
        <span>{cur.label}</span>
        <CaretDown size={16} weight="bold" aria-hidden className={open ? 'flip' : ''} />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="Sort projects">
          <p className="mh">Sort by</p>
          {SORTS.map(({ id: sid, label, hint, Icon }) => (
            <button key={sid} role="menuitemradio" aria-checked={value === sid} className="mi" onClick={() => { onChange(sid); setOpen(false) }}>
              <span className="mic"><Icon size={20} weight="light" aria-hidden /></span>
              <span className="mt"><b>{label}</b><small>{hint}</small></span>
              {value === sid && <Check size={20} weight="bold" aria-hidden className="mk" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail({ p, flag, onInspect }: { p: Project; flag?: Flag; onInspect: () => void }) {
  const [shown, setShown] = useState<'' | 'ok' | 'err'>('')
  const started = day(p.created_on ?? p.first_session)
  const last = day(p.last_session)
  const tiles: [string, string][] = [
    ['Sessions', String(p.sessions)],
    ...(p.active_hours >= 0.05 ? [['Active time', `${p.active_hours.toFixed(1)} hrs`] as [string, string]] : []),
    ...(last ? [['Last opened', last] as [string, string]] : []),
    ...(started ? [['Started', started] as [string, string]] : []),
  ]
  const extras = [p.bpm != null ? `${p.bpm} BPM` : null, p.key, p.variants > 1 ? `${p.variants} versions` : null].filter(Boolean) as string[]
  const choose = (id: Flag) => {
    const next = flag === id ? null : id
    setFlag(p.id, next)
    showToast(next ? `${LABEL[next]}: ${p.name}` : `Cleared: ${p.name}`, () => { setFlag(p.id, flag ?? null); hideToast() })
  }
  return (
    <>
      <div className="dhead">
        <StageMenu p={p} />
        {flag && <span className="tag solid">{flag === 'finish' ? 'Finished' : flag === 'keep' ? 'Kept' : 'Binned'}</span>}
      </div>
      <h2 className="dname">{p.name}</h2>
      <p className="dsub">{plural(p.sessions, 'session')}{p.audio ? '' : ', no audio'}</p>

      {!p.audio && (
        <div className="pcard muted">
          <SpeakerSlash size={20} weight="light" aria-hidden />
          <p>Nothing to play yet. This project has no audio file. Export one from FL Studio to hear it here.</p>
        </div>
      )}

      <dl className="metrics">
        {tiles.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {extras.length > 0 && <ul className="extras" title="Tempo and key are read from sample file names, so treat them as hints.">{extras.map((x) => <li key={x} className="mono">{x}</li>)}</ul>}

      <div className="actions">
        <button className="ghostbtn" onClick={onInspect}><ListMagnifyingGlass size={20} weight="light" aria-hidden /> Full details</button>
        {p.canReveal && (
          <button className="ghostbtn" onClick={async () => { setShown((await reveal(p.id, 'project')) ? 'ok' : 'err'); setTimeout(() => setShown(''), 2200) }}>
            <FolderOpen size={20} weight="light" aria-hidden /> {shown === 'ok' ? 'Shown in Finder' : shown === 'err' ? 'Could not open' : 'Reveal in Finder'}
          </button>
        )}
      </div>

      <div className="triage" role="group" aria-label="Mark this project">
        {FLAGS.map(({ id, label, Icon }) => (
          <button key={id} aria-pressed={flag === id} onClick={() => choose(id)}>
            <Icon size={20} weight={flag === id ? 'fill' : 'light'} aria-hidden /> {label}
          </button>
        ))}
      </div>
    </>
  )
}

export function CratePage({ crate, flags, details, onListen, focus }: { crate: Crate; flags: Record<number, Flag>; details: Details; onListen: () => void; focus: { id: number; n: number } | null }) {
  const [inspect, setInspect] = useState<Project | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 1179px)').matches)
  useEffect(() => {
    const m = matchMedia('(max-width: 1179px)')
    const f = () => setNarrow(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 900px)').matches)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => {
    const m = matchMedia('(max-width: 900px)')
    const f = () => { setMobile(m.matches); if (!m.matches) setFiltersOpen(false) }
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  const [query, setQuery] = useState('')
  const [heard, setHeard] = useState<Heard>('all')
  const [stage, setStage] = useState<string>('any')
  const [triage, setTriage] = useState<Triage>('active')
  const [sort, setSort] = useState<Sort>(() => load('crate.sort', 'recent'))
  const [pick, setPick] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const player = usePlayer()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const needle = query.trim().toLowerCase()
  const passes = (p: Project, skip?: 'heard' | 'stage' | 'triage') => {
    const f = flags[p.id]
    if (needle && !p.name.toLowerCase().includes(needle)) return false
    if (skip !== 'heard') { if (heard === 'playable' && !p.audio) return false; if (heard === 'noaudio' && p.audio) return false }
    if (skip !== 'stage' && stage !== 'any' && p.stage !== stage) return false
    if (skip !== 'triage') {
      if (triage === 'active') { if (f === 'bin') return false } else if (triage === 'unreviewed') { if (f) return false } else if (f !== triage) return false
    }
    return true
  }
  const count = (fn: (p: Project) => boolean, skip: 'heard' | 'stage' | 'triage') => crate.projects.filter((p) => passes(p, skip) && fn(p)).length

  const shown = useMemo(() => {
    const by: Record<Sort, (a: Project, b: Project) => number> = {
      recent: (a, b) => (b.last_session ?? '').localeCompare(a.last_session ?? ''),
      started: (a, b) => (a.first_session ?? '9').localeCompare(b.first_session ?? '9'),
      sessions: (a, b) => b.sessions - a.sessions,
      name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    }
    return crate.projects.filter((p) => passes(p)).sort(by[sort])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crate, flags, query, heard, stage, triage, sort])

  const groups = useMemo(() => {
    if (sort === 'sessions') return [{ label: '', items: shown }]
    const out: { label: string; items: Project[] }[] = []
    shown.forEach((p) => {
      const label = sort === 'name' ? (/[A-Za-z]/.test(p.name.trim()[0] ?? '') ? p.name.trim()[0].toUpperCase() : '#') : monthOf(sort === 'recent' ? p.last_session : p.first_session)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(p)
      else out.push({ label, items: [p] })
    })
    return out
  }, [shown, sort])

  const sel = shown.find((p) => p.id === pick) ?? shown.find((p) => p.audio) ?? shown[0]
  const choosePick = (id: number) => { setPick(id); if (narrow) setDrawer(true) }

  // coming from the player bar: show that project, clearing any filter that hides it
  useEffect(() => {
    if (!focus) return
    setHeard('all'); setStage('any'); setTriage('active'); setQuery('')
    setPick(focus.id)
    setTimeout(() => document.querySelector(`[data-pid="${focus.id}"]`)?.scrollIntoView({ block: 'center' }), 60)
  }, [focus])

  // arrow keys move through the list, Space plays or pauses (like every music app)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName ?? ''
      if (inspect || ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!shown.length) return
        e.preventDefault()
        const at = Math.max(0, shown.findIndex((p) => p.id === sel?.id))
        const nx = shown[Math.min(shown.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))]
        setPick(nx.id)
        document.querySelector(`[data-pid="${nx.id}"]`)?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === ' ' && !['BUTTON', 'SUMMARY', 'A'].includes(tag)) {
        e.preventDefault()
        if (player.id === null) { if (sel?.audio) play({ id: sel.id, audio: sel.audio }) } else toggle()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [shown, sel, inspect, player.id])
  const anyFlags = Object.keys(flags).length > 0
  const flagN = (f: Flag) => crate.projects.filter((p) => flags[p.id] === f).length

  // A filter that no longer matches anything must never leave you on an empty list.
  useEffect(() => {
    if ((triage === 'keep' || triage === 'finish' || triage === 'bin') && flagN(triage) === 0) setTriage('active')
    if (triage === 'unreviewed' && !Object.keys(flags).length) setTriage('active')
    if (stage !== 'any' && !crate.projects.some((p) => p.stage === stage)) setStage('any')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, crate, triage, stage])
  const activeCount = (heard !== 'all' ? 1 : 0) + (stage !== 'any' ? 1 : 0) + (triage !== 'active' ? 1 : 0)
  useEffect(() => {
    if (!filtersOpen && !drawer) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !inspect) { setFiltersOpen(false); setDrawer(false) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [filtersOpen, drawer, inspect])
  const filtered = heard !== 'all' || stage !== 'any' || triage !== 'active' || needle !== ''
  const reset = () => { setHeard('all'); setStage('any'); setTriage('active'); setQuery('') }

  return (
    <div className="lib">
      {(filtersOpen || (drawer && narrow)) && <div className="sheetscrim" onClick={() => { setFiltersOpen(false); setDrawer(false) }} aria-hidden />}
      <aside className={`panel filters sheet${filtersOpen ? ' open' : ''}`} aria-label="Filters" inert={mobile && !filtersOpen ? true : undefined}>
        <span className="sheetgrab" aria-hidden />
        <button className="sheetclose" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={20} /></button>
        <h2 className="sheettitle">Filters</h2>
        <div className="phead split"><div><h1>Library</h1><p>{crate.projects.length} projects{crate.summary.demo ? ', demo' : ''}</p></div><MiniRing done={Object.keys(flags).length} total={crate.projects.length} label={`${Object.keys(flags).length} of ${crate.projects.length} projects sorted`} /></div>

        <div className="fgroup" role="group" aria-label="Show">
          <FilterRow Icon={Stack} label="All projects" count={count(() => true, 'heard')} on={heard === 'all'} onClick={() => setHeard('all')} />
          <FilterRow Icon={SpeakerHigh} label="Playable" count={count((p) => !!p.audio, 'heard')} on={heard === 'playable'} onClick={() => setHeard('playable')} />
          <FilterRow Icon={SpeakerSlash} label="No audio" count={count((p) => !p.audio, 'heard')} on={heard === 'noaudio'} onClick={() => setHeard('noaudio')} />
        </div>

        <div className="flabel row2"><span>Stage</span><StageGuide /></div>
        <div className="fgroup" role="group" aria-label="Stage">
          <FilterRow label="Any stage" count={count(() => true, 'stage')} on={stage === 'any'} onClick={() => setStage('any')} />
          {STAGES.filter((s) => count((p) => p.stage === s, 'stage') > 0 || stage === s).map((s) => (
            <FilterRow key={s} stage={s} label={s} count={count((p) => p.stage === s, 'stage')} on={stage === s} onClick={() => setStage(s)} />
          ))}
        </div>

        {(anyFlags || triage !== 'active') && (
          <>
            <p className="flabel">Your picks</p>
            <div className="fgroup" role="group" aria-label="Your picks">
              <FilterRow label="Active" count={count(() => true, 'triage')} on={triage === 'active'} onClick={() => setTriage('active')} />
              <FilterRow label="Unreviewed" count={count((p) => !flags[p.id], 'triage')} on={triage === 'unreviewed'} onClick={() => setTriage('unreviewed')} />
              {(['keep', 'finish', 'bin'] as Flag[]).filter(flagN).map((f) => (
                <FilterRow key={f} label={f === 'keep' ? 'Kept' : f === 'finish' ? 'Finished' : 'Binned'} count={flagN(f)} on={triage === f} onClick={() => setTriage(f)} />
              ))}
            </div>
          </>
        )}

        <div className="grow" />
        <button className="btn-primary" onClick={() => { setFiltersOpen(false); onListen() }}><Headphones size={20} weight="fill" aria-hidden /> Start listening</button>
      </aside>

      <section className="panel listpanel" aria-label="Projects">
        <header className="mhead">
          <div><h1>Library</h1><p>{crate.projects.length} projects{crate.summary.demo ? ', demo' : ''}</p></div>
          <MiniRing done={Object.keys(flags).length} total={crate.projects.length} label={`${Object.keys(flags).length} of ${crate.projects.length} projects sorted`} />
        </header>
        <div className="lstick">
          <div className="lbar">
            <label className="search">
              <MagnifyingGlass size={20} weight="light" aria-hidden />
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" />
              {query && <button type="button" className="x" aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button>}
            </label>
            <SortMenu value={sort} onChange={(v) => { setSort(v); save('crate.sort', v) }} />
            <button className="filterbtn" onClick={() => setFiltersOpen(true)} aria-label={activeCount ? `Filters, ${activeCount} active` : 'Filters'} aria-haspopup="dialog">
              <SlidersHorizontal size={20} weight="light" aria-hidden />
              {activeCount > 0 && <span className="fdot" aria-hidden>{activeCount}</span>}
            </button>
          </div>
          <div className="quick" role="group" aria-label="What you can hear">
            {([['all', 'All', () => true], ['playable', 'Playable', (p: Project) => !!p.audio], ['noaudio', 'No audio', (p: Project) => !p.audio]] as [Heard, string, (p: Project) => boolean][]).map(([id, l, fn]) => (
              <button key={id} aria-pressed={heard === id} onClick={() => setHeard(id)}>{l}<span className="count">{count(fn, 'heard')}</span></button>
            ))}
          </div>
        </div>
        <p className="status" role="status" aria-live="polite">
          {shown.length} of {crate.projects.length}
          {filtered && <button className="link" onClick={reset}>Clear filters</button>}
        </p>

        <div className="scroller">
          {shown.length === 0 && <p className="empty">Nothing matches these filters.</p>}
          {groups.map((g) => (
            <div key={g.label || 'all'} className="grp">
              {g.label && <h2 className="gh">{g.label}<span>{g.items.length}</span></h2>}
              <ul>
                {g.items.map((p) => {
                  const f = flags[p.id]
                  const playing = player.id === p.id && player.playing
                  return (
                    <li key={p.id} data-pid={p.id} className={`row${sel?.id === p.id ? ' on' : ''}`}>
                      <button
                        className={`rplay${playing ? ' live' : ''}`}
                        disabled={!p.audio}
                        onClick={() => { setPick(p.id); if (p.audio) { if (player.id === p.id) toggle(); else play({ id: p.id, audio: p.audio }) } }}
                        aria-label={p.audio ? `${playing ? 'Pause' : 'Play'} ${p.name}` : `${p.name} has no audio`}
                      >
                        {!p.audio ? <SpeakerSlash size={20} weight="light" /> : playing ? <Pause weight="fill" size={16} /> : <Play weight="fill" size={16} />}
                      </button>
                      <button className="rmain" onClick={() => choosePick(p.id)} onDoubleClick={() => setInspect(p)} aria-current={sel?.id === p.id || undefined}>
                        <span className="rname">{p.name}</span>
                        <span className="rsub">{plural(p.sessions, 'session')}</span>
                      </button>
                      <span className="rend">
                        {f === 'keep' && <Heart size={16} weight="fill" aria-label="Kept" />}
                        {f === 'finish' && <Check size={16} weight="bold" aria-label="Finished" />}
                        {f === 'bin' && <Archive size={16} weight="fill" aria-label="Binned" />}
                        <span className="tag"><Pebble stage={p.stage} />{p.stage}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <aside className={`panel detail${drawer ? ' open' : ''}`} aria-label="Selected project" inert={narrow && !drawer ? true : undefined} style={sel ? { ['--wash' as string]: STONE[sel.stage] } : undefined}>
        <button className="dclose" onClick={() => setDrawer(false)} aria-label="Close details"><X size={20} /></button>
        {sel ? <Detail p={sel} flag={flags[sel.id]} onInspect={() => setInspect(sel)} /> : <p className="empty">Pick a project to see its details.</p>}
      </aside>
      {inspect && <Inspector p={inspect} details={details} projects={crate.projects} flag={flags[inspect.id]} onClose={() => setInspect(null)} />}
    </div>
  )
}
