import { useMemo } from 'react'
import { Headphones } from '@phosphor-icons/react'
import { STAGES, type Crate } from './data'
import { STONE, useCountUp } from './Brand'
import { computeStats } from './stats'

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`

export function StatsPage({ crate, onListen }: { crate: Crate; onListen: () => void }) {
  const s = useMemo(() => computeStats(crate), [crate])
  const hours = useCountUp(s.hours)
  const unheard = useCountUp(s.unheardHours)
  const sessions = useCountUp(s.sessions)
  const peak = s.byHour.indexOf(Math.max(...s.byHour))
  const maxHour = Math.max(...s.byHour)
  const maxSess = s.top[0]?.sessions ?? 1
  const stages = STAGES.map((st) => ({ st, n: crate.projects.filter((p) => p.stage === st).length })).filter((x) => x.n > 0)
  const maxStage = Math.max(...stages.map((x) => x.n), 1)

  return (
    <div className="recap">
      <header className="rhead">
        <div><h1>Recap</h1><p>{s.months} months, {s.projectCount} projects. Measured from your autosaves, not estimated.</p></div>
        <button className="btn-primary" onClick={onListen}><Headphones size={20} weight="fill" aria-hidden /> Start listening</button>
      </header>

      <div className="bento">
        <section className="tile navy a" aria-label="Active time">
          <h2>Active time</h2>
          <div className="num" aria-label={`${s.hours} hours`}>{hours}<small>hrs</small></div>
          <p className="lead">About <b>{Math.round(s.perWeek)} hours a week</b> since {s.sinceMonth}.</p>
          <p className="how">A session ends after 45 minutes without an autosave. The file's own time-open counter was rejected because it counts idle time.</p>
        </section>

        <section className="tile warm b" aria-label="Never heard">
          <h2>Never heard</h2>
          <div className="num" aria-label={`${s.unheardHours} hours`}>{unheard}<small>hrs</small></div>
          <p className="lead"><b>{s.unheardCount} of {s.projectCount}</b> projects have no audio file.</p>
          <div className="strip" aria-hidden>
            {s.bars.map((on, n) => <i key={n} className={on ? 'on' : ''} />)}
          </div>
          <p className="how">Each tick is a project. Short ones have no audio file to play.</p>
        </section>

        <section className="tile c" aria-label="Sessions">
          <h2>Sessions</h2>
          <div className="num" aria-label={`${s.sessions} sessions`}>{sessions}</div>
          <p className="lead">across {s.projectCount} projects.</p>
        </section>

        <section className="tile d" aria-label="Most reopened">
          <h2>Most reopened</h2>
          <ol className="rank">
            {s.top.slice(0, 5).map((p) => (
              <li key={p.id}>
                <span className="nm">{p.name}</span>
                <span className="ct">{p.sessions}</span>
                <span className="bar"><i style={{ width: `${(p.sessions / maxSess) * 100}%` }} /></span>
              </li>
            ))}
          </ol>
        </section>

        <section className="tile f" aria-label="Where projects sit">
          <h2>Where they sit</h2>
          <div className="fwrap">
          <div className="stack" role="img" aria-label={stages.map((x) => `${x.n} at ${x.st}`).join(', ')}>
            {stages.map(({ st, n }, i) => {
              const w = 44 + Math.sqrt(n / maxStage) * 84
              return <span key={st} className="stone" style={{ ['--c' as string]: STONE[st], width: w, height: w * 0.46, marginLeft: (i % 2 ? 1 : -1) * 6, animationDelay: `${i * 90}ms` }} />
            })}
          </div>
          <ul className="legend">
            {stages.map(({ st, n }) => <li key={st}><span className="peb" style={{ ['--c' as string]: STONE[st] }} aria-hidden />{st}<b className="mono">{n}</b></li>)}
          </ul>
          </div>
        </section>

        <section className="tile e" aria-label="When you start">
          <h2>When you start</h2>
          <p className="lead">Most projects begin around <b>{hourLabel(peak)}</b>.</p>
          <div className="hist" role="img" aria-label={`Projects started by hour of day, busiest around ${hourLabel(peak)}`}>
            {s.byHour.map((n, h) => <i key={h} className={h === peak ? 'peak' : ''} style={{ height: `${Math.max(2, (n / maxHour) * 100)}%` }} title={`${hourLabel(h)}: ${n}`} />)}
          </div>
          <div className="axis" aria-hidden><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
          <p className="how">First autosave of each of {s.hourSample} projects.</p>
        </section>
      </div>
    </div>
  )
}
