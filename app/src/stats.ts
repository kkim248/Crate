import type { Crate, Project } from './data'

// Everything here is measured from crate.json. Nothing is estimated or invented.
export function computeStats(crate: Crate) {
  const { projects, summary } = crate
  const unheard = projects.filter((p) => !p.audio)
  const firsts = projects.map((p) => p.first_session).filter((s): s is string => !!s).map((s) => new Date(s))
  const start = new Date(Math.min(...firsts.map((d) => d.getTime())))
  const end = new Date(summary.generated)
  const weeks = Math.max(1, (end.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000))

  const byHour = Array.from({ length: 24 }, () => 0)
  firsts.forEach((d) => { byHour[d.getHours()]++ })

  const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (30.44 * 24 * 3600 * 1000)))
  const ordered = [...projects].sort((a, b) => (a.first_session ?? '9').localeCompare(b.first_session ?? '9'))
  const top = [...projects].sort((a, b) => b.sessions - a.sessions).slice(0, 6)

  return {
    hours: Math.round(summary.active_hours),
    perWeek: summary.active_hours / weeks,
    sinceMonth: start.toLocaleString('en-US', { month: 'long' }),
    sessions: summary.total_sessions,
    projectCount: projects.length,
    unheardHours: Math.round(summary.unheard_hours),
    unheardCount: unheard.length,
    top,
    byHour,
    hourSample: firsts.length,
    months,
    playableCount: projects.length - unheard.length,
    bars: ordered.map((p) => !!p.audio),
  }
}

export type Stats = ReturnType<typeof computeStats>
export type { Project }
