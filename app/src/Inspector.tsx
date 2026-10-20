import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Check, FolderOpen, Heart, MagnifyingGlass, Warning, X } from '@phosphor-icons/react'
import { reveal, type Details, type Flag, type Project, type Used } from './data'
import { Pebble } from './Brand'

type Tab = 'overview' | 'sound' | 'samples'
const plural = (c: number, w: string) => `${c} ${w}${c === 1 ? '' : 's'}`
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null)
const size = (kb: number | null | undefined) => (kb == null ? null : kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`)

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="facts">
      {items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  )
}

function Rows({ list, usage, empty }: { list: Used[]; usage: Map<string, number>; empty: string }) {
  if (!list.length) return <p className="none">{empty}</p>
  const max = Math.max(...list.map((u) => u.count))
  return (
    <ul className="urows">
      {list.map((u) => {
        const n = usage.get(u.name) ?? 1
        return (
          <li key={u.name}>
            <span className="un">{u.name}</span>
            <span className={`kind ${u.kind === 'VST' ? 'vst' : ''}`}>{u.kind === 'VST' ? 'VST' : 'Native'}</span>
            <span className="uc mono" title={`${u.count} on this project`}>{u.count > 1 ? `x${u.count}` : ''}</span>
            <span className="ux">{n > 1 ? `in ${plural(n, 'project')}` : 'Only here'}</span>
            <span className="ub"><i style={{ width: `${(u.count / max) * 100}%` }} /></span>
          </li>
        )
      })}
    </ul>
  )
}

export function Inspector({ p, details, projects, flag, onClose }: { p: Project; details: Details; projects: Project[]; flag?: Flag; onClose: () => void }) {
  const d = details[p.folder]
  const dialog = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [filter, setFilter] = useState('')
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement
    dialog.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !dialog.current) return
      const f = [...dialog.current.querySelectorAll<HTMLElement>('button, summary, [href], input, [tabindex="0"]')].filter((x) => !x.hasAttribute('disabled'))
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); opener.current?.focus?.() }
  }, [onClose])

  // how often each plugin appears across the whole library
  const usage = useMemo(() => {
    const m = new Map<string, number>()
    projects.forEach((q) => {
      const e = details[q.folder]
      if (!e?.readable) return
      new Set([...(e.instruments ?? []), ...(e.effects ?? [])].map((u) => u.name)).forEach((n) => m.set(n, (m.get(n) ?? 0) + 1))
    })
    return m
  }, [details, projects])

  // where this project sits inside the whole seven months
  const span = useMemo(() => {
    const t = projects.flatMap((q) => [q.first_session, q.last_session]).filter((x): x is string => !!x).map((x) => +new Date(x))
    const lo = Math.min(...t), hi = Math.max(...t)
    const a = p.first_session ? +new Date(p.first_session) : null
    const b = p.last_session ? +new Date(p.last_session) : null
    if (a == null || b == null || hi === lo) return null
    return { left: ((a - lo) / (hi - lo)) * 100, width: Math.max(1.5, ((b - a) / (hi - lo)) * 100), lo: new Date(lo), hi: new Date(hi), days: Math.max(1, Math.round((b - a) / 86400000)) }
  }, [projects, p])

  const doReveal = async (t: 'project' | 'audio') => {
    const ok = await reveal(p.id, t)
    setToast(ok ? 'Shown in Finder' : 'Could not open Finder')
    setTimeout(() => setToast(''), 2200)
  }

  const readable = !!d?.readable
  const instruments = d?.instruments ?? []
  const effects = d?.effects ?? []
  const samples = d?.samples ?? []
  const avgMin = p.sessions > 0 && p.active_hours > 0 ? Math.round((p.active_hours * 60) / p.sessions) : null
  const started = day(p.created_on ?? p.first_session)
  const last = day(p.last_session)
  const FlagIcon = flag === 'keep' ? Heart : flag === 'finish' ? Check : flag === 'bin' ? Archive : null
  const tabs: { id: Tab; label: string; n?: number }[] = readable
    ? [{ id: 'overview', label: 'Overview' }, { id: 'sound', label: 'Sound', n: instruments.length + effects.length }, { id: 'samples', label: 'Samples', n: samples.length }]
    : [{ id: 'overview', label: 'Overview' }]

  const headline: [string, string][] = [
    ['Sessions', String(p.sessions)],
    ...(p.active_hours >= 0.05 ? [['Active time', `${p.active_hours.toFixed(1)} hrs`] as [string, string]] : []),
    ...(readable ? [['Instruments', String(instruments.length)] as [string, string], ['Samples', String(samples.length)] as [string, string]] : []),
  ]
  const facts: [string, string][] = ([
    ['Channels', p.channels != null ? String(p.channels) : ''],
    ['Patterns', (d?.patterns ?? p.patterns) != null ? String(d?.patterns ?? p.patterns) : ''],
    ['Arrangement', d?.arrangement_bars ? `${d.arrangement_bars} bars` : ''],
    ['File size', size(d?.file_kb ?? p.size_kb) ?? ''],
    ['FL Studio', d?.fl_version?.replace(/^(\d+\.\d+\.\d+).*/, '$1') ?? ''],
  ] as [string, string][]).filter(([, v]) => v)
  const shownSamples = samples.filter((s) => !filter.trim() || s.name.toLowerCase().includes(filter.trim().toLowerCase()))

  const onTabKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === tab)
    if (e.key === 'ArrowRight') { e.preventDefault(); setTab(tabs[(i + 1) % tabs.length].id) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(tabs[(i - 1 + tabs.length) % tabs.length].id) }
  }

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="inspector" role="dialog" aria-modal="true" aria-labelledby="insp-title" tabIndex={-1} ref={dialog}>
        <header className="ihead">
          <div className="ititle">
            <div className="dhead">
              <span className="tag outline"><Pebble stage={p.stage} />{p.stage}</span>
              {FlagIcon && <span className="tag solid"><FlagIcon size={16} weight="fill" aria-hidden />{flag === 'finish' ? 'Finished' : flag === 'keep' ? 'Kept' : 'Binned'}</span>}
            </div>
            <h2 id="insp-title">{p.name}</h2>
            <p>{plural(p.sessions, 'session')}{span ? ` over ${plural(span.days, 'day')}` : ''}{avgMin ? `, about ${avgMin} min each` : ''}</p>
          </div>
          <div className="iactions">
            {p.canReveal && <button className="ibtn" onClick={() => doReveal('project')}><FolderOpen size={20} weight="light" aria-hidden /> Reveal project</button>}
            {p.audio && p.canReveal && <button className="ibtn" onClick={() => doReveal('audio')}><FolderOpen size={20} weight="light" aria-hidden /> Reveal audio file</button>}
            <button className="iclose" onClick={onClose} aria-label="Close details"><X size={20} /></button>
          </div>
        </header>

        {tabs.length > 1 && (
          <div className="itabs" role="tablist" aria-label="Details" onKeyDown={onTabKey}>
            {tabs.map((t) => (
              <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}>
                {t.label}{t.n != null && <span className="mono">{t.n}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="ibody" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {!readable && (
            <div className="inote" role="note">
              <Warning size={20} weight="light" aria-hidden />
              <p><b>This project could not be read in detail.</b> FL Studio saved it in a layout the parser does not understand yet{d?.reason ? ` (${d.reason})` : ''}. Showing what the folder itself tells us.</p>
            </div>
          )}

          {tab === 'overview' && (
            <div className="igrid">
              <div className="icol">
                <Facts items={headline} />
                <section className="icard" aria-label="Where it sits in time">
                  <h3>In your seven months</h3>
                  {span ? (
                    <>
                      <div className="track" role="img" aria-label={`Worked on from ${day(p.first_session)} to ${day(p.last_session)}`}>
                        <i style={{ left: `${span.left}%`, width: `${span.width}%` }} />
                      </div>
                      <div className="tlab mono"><span>{span.lo.toLocaleString('en-US', { month: 'short' })}</span><span>{span.hi.toLocaleString('en-US', { month: 'short' })}</span></div>
                    </>
                  ) : <p className="none">No session history for this project.</p>}
                  <p className="when">{started ? `Started ${started}` : ''}{started && last ? ', ' : ''}{last ? `last opened ${last}` : ''}.</p>
                </section>
                {facts.length > 0 && (
                  <section className="icard" aria-label="Project facts">
                    <h3>Project</h3>
                    <Facts items={facts} />
                  </section>
                )}
              </div>
              <div className="icol">
                <section className="icard" aria-label="Stage">
                  <h3>Stage: {p.stage}{p.estimated ? ' (estimated)' : ''}</h3>
                  <p className="when" style={{ marginTop: 0 }}>{p.overridden ? `You set this. Crate detected ${p.detected}.` : p.reasons?.join(' ')}</p>
                </section>
                {readable && instruments.length > 0 && (
                  <section className="icard" aria-label="Most used instruments">
                    <h3>Main instruments</h3>
                    <ul className="top">
                      {instruments.slice(0, 4).map((u) => <li key={u.name}><span>{u.name}</span><small>{u.kind === 'VST' ? 'VST' : 'Native'}</small></li>)}
                    </ul>
                    {instruments.length > 4 && <button className="more" onClick={() => setTab('sound')}>See all {instruments.length}</button>}
                  </section>
                )}
                {(p.bpm != null || p.key) && <p className="how">Tempo ({p.bpm != null ? `${p.bpm} BPM` : 'not found'}) and key ({p.key ?? 'not found'}) are read from sample file names, so treat them as hints.</p>}
              </div>
            </div>
          )}

          {tab === 'sound' && readable && (
            <div className="igrid">
              <section className="icard" aria-label="Instruments and VSTs">
                <h3>Instruments and VSTs <span className="mono">{instruments.length}</span></h3>
                <Rows list={instruments} usage={usage} empty="No instrument plugins found." />
              </section>
              <section className="icard" aria-label="Effects">
                <h3>Effects <span className="mono">{effects.length}</span></h3>
                <Rows list={effects} usage={usage} empty="No effects found." />
                <p className="how">FL Studio 25 stores some mixer slots in a layout the parser cannot read yet, so this list may be incomplete.</p>
              </section>
            </div>
          )}

          {tab === 'samples' && readable && (
            <section className="icard" aria-label="Samples">
              <h3>Samples <span className="mono">{samples.length}</span></h3>
              {samples.length === 0 ? <p className="none">No samples found.</p> : (
                <>
                  <ul className="srcs">
                    {(d?.sample_sources ?? []).slice(0, 6).map((s) => <li key={s.name}><b className="mono">{s.count}</b>{s.name}</li>)}
                  </ul>
                  <label className="sfilter">
                    <MagnifyingGlass size={16} weight="light" aria-hidden />
                    <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter samples" aria-label="Filter samples" />
                  </label>
                  <ul className="slist">
                    {shownSamples.map((s, n) => <li key={n}><span>{s.name}</span><small>{s.source}</small></li>)}
                    {shownSamples.length === 0 && <li className="none">No sample matches.</li>}
                  </ul>
                </>
              )}
            </section>
          )}

          {!readable && (
            <section className="icard" aria-label="What we know">
              <h3>What we know</h3>
              <Facts items={[...headline, ...(size(p.size_kb) ? [['File size', size(p.size_kb)!] as [string, string]] : []), ...(started ? [['Started', started] as [string, string]] : [])]} />
            </section>
          )}
        </div>
        <p className="toast" role="status" aria-live="polite">{toast}</p>
      </div>
    </div>
  )
}
