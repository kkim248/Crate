import { useEffect, useState, useSyncExternalStore } from 'react'

export type Stage = 'Skeleton' | 'Loop' | 'Arranging' | 'Mixing' | 'Review'
export const STAGES: Stage[] = ['Skeleton', 'Loop', 'Arranging', 'Mixing', 'Review']

export type Project = {
  id: number
  name: string
  folder: string
  stage: Stage
  variants: number
  sessions: number
  active_hours: number
  created_on: string | null
  first_session: string | null
  last_session: string | null
  bpm: number | null
  key: string | null
  audio: string | null
  canReveal: boolean
  detected?: Stage
  reasons?: string[]
  estimated?: boolean
  overridden?: boolean
  size_kb: number | null
  channels: number | null
  patterns: number | null
}

export type Summary = {
  generated: string
  projects: number
  playable: number
  active_hours: number
  total_sessions: number
  unheard_hours: number
  demo?: boolean
}

export type Crate = { summary: Summary; projects: Project[] }

export function useCrate() {
  const [crate, setCrate] = useState<Crate | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/crate')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setCrate)
      .catch((e) => setError(String(e.message ?? e)))
  }, [])
  return { crate, error }
}

// ---- flags (finish / keep / bin) live in the browser only; source files are never touched
export type Flag = 'finish' | 'keep' | 'bin'
const KEY = 'crate.flags.v1'
let flags: Record<number, Flag> = read()
const subs = new Set<() => void>()

function read(): Record<number, Flag> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}
export function setFlag(id: number, flag: Flag | null) {
  flags = { ...flags }
  if (flag) flags[id] = flag
  else delete flags[id]
  try { localStorage.setItem(KEY, JSON.stringify(flags)) } catch { /* storage unavailable */ }
  subs.forEach((f) => f())
}
export function useFlags() {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f) } },
    () => flags,
  )
}

// ---- deep details (plugins, effects, samples) from details.json, produced by scan_details.py
export type Used = { name: string; count: number; kind: 'VST' | 'Native' }
export type Detail = {
  readable: boolean
  reason?: string
  fl_version?: string
  instruments?: Used[]
  effects?: Used[]
  inserts_used?: number
  samples?: { name: string; source: string }[]
  sample_sources?: { name: string; count: number }[]
  patterns?: number | null
  arrangement_bars?: number | null
  playlist_items?: number
  inserts_named?: number
  file_kb?: number
}
export type Details = Record<string, Detail>

export function useDetails(): [Details, boolean] {
  const [d, setD] = useState<Details>({})
  const [ready, setReady] = useState(false)
  useEffect(() => {
    fetch('/api/details').then((r) => (r.ok ? r.json() : {})).then(setD).catch(() => setD({})).finally(() => setReady(true))
  }, [])
  return [d, ready]
}

export type Loud = Record<string, { lufs: number; peak: number }>
export function useLoudness(): Loud {
  const [l, setL] = useState<Loud>({})
  useEffect(() => {
    fetch('/api/loudness').then((r) => (r.ok ? r.json() : {})).then(setL).catch(() => setL({}))
  }, [])
  return l
}

export async function reveal(id: number, target: 'project' | 'audio') {
  const r = await fetch(`/api/reveal/${id}/${target}`, { method: 'POST' })
  return r.ok
}

// ---- small confirmation toast with Undo, like the big music apps use after an action
export type Toast = { id: number; text: string; undo?: () => void } | null
let toast: Toast = null
let toastTimer: ReturnType<typeof setTimeout> | undefined
const toastSubs = new Set<() => void>()
export function showToast(text: string, undo?: () => void) {
  clearTimeout(toastTimer)
  toast = { id: Date.now(), text, undo }
  toastSubs.forEach((f) => f())
  toastTimer = setTimeout(hideToast, 5000)
}
export function hideToast() {
  toast = null
  toastSubs.forEach((f) => f())
}
export function useToast() {
  return useSyncExternalStore(
    (f) => { toastSubs.add(f); return () => { toastSubs.delete(f) } },
    () => toast,
  )
}

// ---- stages you set by hand. Detection is a best guess, so your word wins and is remembered.
const SKEY = 'crate.stages.v1'
let overrides: Record<string, Stage> = (() => { try { return JSON.parse(localStorage.getItem(SKEY) ?? '{}') } catch { return {} } })()
const ovSubs = new Set<() => void>()
export function setStageOverride(folder: string, stage: Stage | null) {
  overrides = { ...overrides }
  if (stage) overrides[folder] = stage
  else delete overrides[folder]
  try { localStorage.setItem(SKEY, JSON.stringify(overrides)) } catch { /* storage unavailable */ }
  ovSubs.forEach((f) => f())
}
export function useStageOverrides() {
  return useSyncExternalStore(
    (f) => { ovSubs.add(f); return () => { ovSubs.delete(f) } },
    () => overrides,
  )
}
