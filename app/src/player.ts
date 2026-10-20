import { useSyncExternalStore } from 'react'

// One shared audio element for the whole app, so Library, Listen and the player bar never fight.
type State = {
  id: number | null; playing: boolean; duration: number; loading: boolean; error: boolean; ended: boolean
  volume: number; muted: boolean; leveling: boolean; levelDb: number
}

const KEY = 'crate.audio.v1'
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } })()
const TARGET_LUFS = -14   // the level most streaming services aim for

let audio: HTMLAudioElement | null = null
let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let normGain: GainNode | null = null
let volGain: GainNode | null = null
let loud: Record<number, { lufs: number; peak: number }> = {}
let state: State = {
  id: null, playing: false, duration: 0, loading: false, error: false, ended: false,
  volume: typeof saved.volume === 'number' ? saved.volume : 0.9, muted: !!saved.muted, leveling: saved.leveling !== false, levelDb: 0,
}
const subs = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  subs.forEach((f) => f())
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ volume: state.volume, muted: state.muted, leveling: state.leveling })) } catch { /* storage unavailable */ }
}

/** Loudness per project id (from loudness.json). Used to even out loud and quiet tracks. */
export function setLoudness(m: Record<number, { lufs: number; peak: number }>) {
  loud = m
  if (state.id !== null) { set({ levelDb: levelFor(state.id) }); applyGains() }
}

// Gain that brings a track to the target loudness, never boosting past its own peak so it cannot clip.
function levelFor(id: number): number {
  const m = loud[id]
  if (!state.leveling || !m) return 0
  const want = Math.max(-18, Math.min(12, TARGET_LUFS - m.lufs))
  const headroom = m.peak > 0 ? -20 * Math.log10(m.peak) - 0.3 : 12
  return Math.round(Math.min(want, headroom) * 10) / 10
}

function applyGains(immediate = false) {
  if (!ctx || !normGain || !volGain) return
  const t = ctx.currentTime
  // a new track gets its level instantly so a loud one never blasts for a moment
  if (immediate) { normGain.gain.cancelScheduledValues(t); normGain.gain.setValueAtTime(10 ** (state.levelDb / 20), t) }
  else normGain.gain.setTargetAtTime(10 ** (state.levelDb / 20), t, 0.02)
  volGain.gain.setTargetAtTime(state.muted ? 0 : state.volume ** 2, t, 0.02)   // squared: feels even across the slider
}

export function setVolume(v: number) {
  set({ volume: Math.max(0, Math.min(1, v)), muted: false }); persist(); applyGains()
}
export function toggleMute() { set({ muted: !state.muted }); persist(); applyGains() }
export function setLeveling(on: boolean) {
  set({ leveling: on }); persist()
  set({ levelDb: state.id === null ? 0 : levelFor(state.id) }); applyGains()
}

function el() {
  if (audio) return audio
  const a = new Audio()
  a.preload = 'auto'
  a.addEventListener('play', () => set({ playing: true, ended: false }))
  a.addEventListener('pause', () => set({ playing: false }))
  a.addEventListener('ended', () => set({ playing: false, ended: true }))
  a.addEventListener('loadedmetadata', () => set({ duration: a.duration }))
  a.addEventListener('loadstart', () => set({ loading: true }))
  a.addEventListener('waiting', () => set({ loading: true }))
  a.addEventListener('canplay', () => set({ loading: false }))
  a.addEventListener('playing', () => set({ loading: false }))
  a.addEventListener('error', () => { if (a.getAttribute('src')) set({ error: true, loading: false, playing: false }) })
  audio = a
  return a
}

function ensureAnalyser() {
  if (ctx || !audio) return
  ctx = new AudioContext()
  const src = ctx.createMediaElementSource(audio)
  analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.8
  normGain = ctx.createGain()
  volGain = ctx.createGain()
  // source -> level matching -> analyser (for the ring) -> volume -> speakers
  src.connect(normGain)
  normGain.connect(analyser)
  analyser.connect(volGain)
  volGain.connect(ctx.destination)
  applyGains()
}

export function play(p: { id: number; audio: string }) {
  const a = el()
  if (state.id !== p.id || state.error) {
    a.src = p.audio
    set({ id: p.id, duration: 0, playing: false, error: false, ended: false, loading: true, levelDb: levelFor(p.id) })
  }
  ensureAnalyser()
  applyGains(true)
  void ctx?.resume()
  void a.play().catch(() => set({ playing: false }))
}

export function toggle() {
  const a = audio
  if (!a || state.id === null) return
  void ctx?.resume()
  if (a.paused) void a.play().catch(() => undefined)
  else a.pause()
}

export function stop() {
  if (!audio) return
  audio.pause()
  audio.removeAttribute('src')
  set({ id: null, playing: false, duration: 0, loading: false, error: false, ended: false, levelDb: 0 })
}

export function seek(ratio: number) {
  if (audio && audio.duration) audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration
}

export function progress(id: number): number {
  return audio && state.id === id && audio.duration ? audio.currentTime / audio.duration : 0
}

export function clock(id: number): string {
  if (!audio || state.id !== id) return '0:00'
  return mmss(audio.currentTime)
}

export const mmss = (s: number) =>
  isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00'

/** Fills `buf` with 0..255 frequency magnitudes. Returns false when nothing is playing. */
export function spectrum(buf: Uint8Array): boolean {
  if (!analyser || !audio || audio.paused) return false
  analyser.getByteFrequencyData(buf as Uint8Array<ArrayBuffer>)
  return true
}

export function usePlayer() {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f) } },
    () => state,
  )
}
