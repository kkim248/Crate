import { useEffect, useRef } from 'react'
import { useReducedMotion } from './Brand'
import { progress, seek, spectrum } from './player'

const TICKS = 96
const TONES = {
  dark: { on: 'rgba(243,242,247,.96)', off: 'rgba(243,242,247,.26)' },
  light: { on: '#25243A', off: 'rgba(37,36,58,.22)' },
}

// A ring of tick marks, like a watch face. Played ticks are lit; tick length follows the real audio spectrum.
export function Ring({ id, tone = 'dark', live = true }: { id: number; tone?: keyof typeof TONES; live?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')!
    const col = TONES[tone]
    const amp = new Float32Array(TICKS)
    const buf = new Uint8Array(128)
    let raf = 0
    const draw = () => {
      const box = c.getBoundingClientRect()
      const px = Math.round(box.width * (window.devicePixelRatio || 1))
      if (c.width !== px) { c.width = px; c.height = px }
      const s = c.width
      const hot = live && !reduce && spectrum(buf)
      const r = progress(id)
      g.clearRect(0, 0, s, s)
      g.lineCap = 'round'
      g.lineWidth = Math.max(2, s * 0.0085)
      const R = s * 0.4
      for (let i = 0; i < TICKS; i++) {
        const f = i / TICKS
        const gi = f < 0.5 ? f * 2 : (1 - f) * 2
        const target = hot ? Math.pow(buf[Math.floor(gi * 70)] / 255, 1.4) : 0
        amp[i] += (target - amp[i]) * 0.2
        const len = s * (0.035 + amp[i] * 0.085)
        const a = f * Math.PI * 2 - Math.PI / 2
        g.strokeStyle = r > 0 && f <= r ? col.on : col.off
        g.beginPath()
        g.moveTo(s / 2 + Math.cos(a) * R, s / 2 + Math.sin(a) * R)
        g.lineTo(s / 2 + Math.cos(a) * (R + len), s / 2 + Math.sin(a) * (R + len))
        g.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [id, tone, live, reduce])

  // click anywhere on the ring to jump to that point
  const jump = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    const a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) + Math.PI / 2
    seek(((a / (Math.PI * 2)) % 1 + 1) % 1)
  }
  return <canvas ref={ref} className="ringcv" aria-hidden onPointerDown={jump} />
}

/** Static ring for progress that is not audio: `done` of `total` ticks lit. */
export function MiniRing({ done, total, label }: { done: number; total: number; label: string }) {
  const n = 36
  const lit = total ? Math.round((done / total) * n) : 0
  return (
    <div className="mr" role="img" aria-label={label}>
      {Array.from({ length: n }, (_, i) => <i key={i} className={i < lit ? 'on' : ''} style={{ ['--a' as string]: `${(i / n) * 360}deg` }} />)}
      <b>{done}</b>
    </div>
  )
}
