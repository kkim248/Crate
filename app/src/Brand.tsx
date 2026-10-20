import { useEffect, useState } from 'react'

// Brand mark: five bars, a crate seen edge-on. Tick marks are the product's visual motif
// (listening ring, recap strips), so the mark and the UI speak the same language.
export function Mark({ size = 40 }: { size?: number }) {
  const h = [10, 18, 14, 22, 8]
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="13" fill="#25243A" />
      {h.map((v, i) => <rect key={i} x={9 + i * 5.5} y={20 - v / 2} width="3" height={v} rx="1.5" fill="#F3F2F7" />)}
    </svg>
  )
}

export function useReducedMotion() {
  const [r, setR] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setR(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return r
}

export function useCountUp(to: number, ms = 1100) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? to : 0)
  useEffect(() => {
    if (reduce) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, reduce])
  return v
}

// Stage colours: wisteria grey, blush, amber, sage, light grey cloud (Japanese colours palette).
export const STONE: Record<string, string> = {
  Skeleton: '#A6A5C4',
  Loop: '#E3BDC4',
  Arranging: '#E4B978',
  Mixing: '#A8C3A0',
  Review: '#D4DCDA',
}

export function Pebble({ stage }: { stage: string }) {
  return <span className="peb" style={{ ['--c' as string]: STONE[stage] }} aria-hidden />
}
