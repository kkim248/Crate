import { useEffect, useRef, useState } from 'react'
import { CaretDown, Check, Info } from '@phosphor-icons/react'
import { STAGES, hideToast, setStageOverride, showToast, type Project, type Stage } from './data'
import { Pebble } from './Brand'
import { STAGE_RULES } from './stage'

function useMenu() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', away)
    wrap.current?.querySelector<HTMLElement>('[aria-checked="true"], .mi')?.focus()
    return () => document.removeEventListener('mousedown', away)
  }, [open])
  const key = (e: React.KeyboardEvent) => {
    const items = [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') { setOpen(false); wrap.current?.querySelector<HTMLElement>('.stagebtn, .guidebtn')?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(at + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(at - 1 + items.length) % items.length]?.focus() }
  }
  return { open, setOpen, wrap, key }
}

// Click the stage on a project to correct it. Crate remembers, and can show why it chose what it did.
export function StageMenu({ p }: { p: Project }) {
  const { open, setOpen, wrap, key } = useMenu()
  const choose = (s: Stage) => {
    const prev = p.overridden ? p.stage : null
    setStageOverride(p.folder, s === p.detected ? null : s)
    showToast(s === p.detected ? `Back to detected: ${s}` : `Stage set to ${s}: ${p.name}`, () => { setStageOverride(p.folder, prev); hideToast() })
    setOpen(false)
  }
  return (
    <div className="menuwrap" ref={wrap} onKeyDown={key}>
      <button className="tag outline stagebtn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} title="Change this project's stage">
        <Pebble stage={p.stage} />{p.stage}{p.estimated ? ' (estimated)' : ''}<CaretDown size={16} weight="bold" aria-hidden />
      </button>
      {p.overridden && <span className="setby">Set by you</span>}
      {open && (
        <div className="menu left" role="menu" aria-label="Stage">
          <p className="mh">Why {p.detected}?</p>
          <p className="why">{p.reasons?.join(' ')}</p>
          <p className="mh">Set the stage yourself</p>
          {STAGES.map((s) => (
            <button key={s} role="menuitemradio" aria-checked={p.stage === s} className="mi slim" onClick={() => choose(s)}>
              <span className="mic"><Pebble stage={s} /></span>
              <span className="mt"><b>{s}</b>{s === p.detected && <small>What Crate detected</small>}</span>
              {p.stage === s && <Check size={20} weight="bold" aria-hidden className="mk" />}
            </button>
          ))}
          {p.overridden && <button className="mi slim reset" onClick={() => choose(p.detected!)}>Reset to detected</button>}
        </div>
      )}
    </div>
  )
}

// A small "how are stages decided" guide next to the Stage filter heading.
export function StageGuide() {
  const { open, setOpen, wrap, key } = useMenu()
  return (
    <div className="menuwrap guide" ref={wrap} onKeyDown={key}>
      <button className="guidebtn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label="How stages are decided">
        <Info size={16} weight="light" aria-hidden />
      </button>
      {open && (
        <div className="menu left guidebox" role="dialog" aria-label="How stages are decided">
          <p className="mh">How stages are decided</p>
          <ul>
            {STAGE_RULES.map((r) => <li key={r.stage}><Pebble stage={r.stage} /><span><b>{r.stage}</b>{r.rule}</span></li>)}
          </ul>
          <p className="gfoot">Crate reads this from the project file and whether an audio file exists. If it is wrong, click a project's stage to change it. Crate remembers your choice.</p>
        </div>
      )}
    </div>
  )
}
