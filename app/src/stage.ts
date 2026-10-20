import type { Detail, Project, Stage } from './data'

// How Crate decides which stage a project is at. It reads evidence from the project file
// (arrangement length, patterns, channels, mixer names), whether an audio file exists, and
// how much you have worked on it. Nothing here is a guess unless the file cannot be read.
export type Verdict = { stage: Stage; reasons: string[]; estimated: boolean }

export const STAGE_RULES: { stage: Stage; rule: string }[] = [
  { stage: 'Skeleton', rule: 'A sketch. Only a few sounds and patterns, nothing laid out yet.' },
  { stage: 'Loop', rule: 'Several patterns or 10 or more sounds, but nothing in the playlist yet.' },
  { stage: 'Arranging', rule: 'A playlist arrangement of 24 bars or more, or 15 or more patterns.' },
  { stage: 'Mixing', rule: 'Arranged for 48 bars or more, and an audio file exists.' },
  { stage: 'Review', rule: 'Mixing, plus 64 bars or more, 8 or more named mixer tracks and 10 or more sessions.' },
]

const n = (c: number, w: string) => `${c} ${w}${c === 1 ? '' : 's'}`

export function detectStage(p: Project, d?: Detail): Verdict {
  const audio = !!p.audio
  if (!d?.readable) {
    const kb = p.size_kb ?? 0
    const stage: Stage = kb >= 600 || (audio && p.active_hours >= 3) ? 'Loop' : 'Skeleton'
    return {
      stage,
      estimated: true,
      reasons: [`FL Studio saved this project in a format Crate cannot read, so the stage is a guess from its file size (${Math.round(kb)} KB) and work time.`],
    }
  }

  const bars = d.arrangement_bars ?? 0
  const patterns = d.patterns ?? p.patterns ?? 0
  const channels = p.channels ?? 0
  const named = d.inserts_named ?? 0
  const arranged = bars >= 24
  const longArr = bars >= 48
  const wide = patterns >= 15

  if (audio && bars >= 64 && named >= 8 && p.sessions >= 10) {
    return { stage: 'Review', estimated: false, reasons: [`It has an audio file, an arrangement ${Math.round(bars)} bars long, ${n(named, 'named mixer track')} and ${n(p.sessions, 'session')} of work.`] }
  }
  if (longArr && audio) {
    return { stage: 'Mixing', estimated: false, reasons: [`The arrangement runs ${Math.round(bars)} bars and an audio file exists, so it has been played back as a whole.`] }
  }
  if (arranged || wide) {
    return {
      stage: 'Arranging',
      estimated: false,
      reasons: arranged
        ? [`The playlist has an arrangement ${Math.round(bars)} bars long${longArr ? ', but no audio file yet' : ''}.`]
        : [`${n(patterns, 'pattern')} and ${n(channels, 'channel')} is well past a loop, though nothing is laid out in the playlist yet.`],
    }
  }
  if (patterns >= 4 || channels >= 10) {
    return { stage: 'Loop', estimated: false, reasons: [`${n(patterns, 'pattern')} and ${n(channels, 'channel')}, but no arrangement in the playlist yet.`] }
  }
  return { stage: 'Skeleton', estimated: false, reasons: [`Only ${n(patterns, 'pattern')} and ${n(channels, 'channel')} so far.`] }
}
