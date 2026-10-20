import { useEffect, useRef, type RefObject } from 'react'

// Swipe a bottom sheet down to dismiss it. Dragging the grabber always works; dragging the
// content works when it is scrolled to the top. The sheet follows the finger, then either closes
// (a long pull or a quick flick) or springs back. Only active on phone-sized screens.
export function attachSheetDrag(el: HTMLElement, onClose: () => void): () => void {
  const isMobile = () => matchMedia('(max-width: 900px)').matches
  const isOpen = () => !el.matches('.filters.sheet, .detail') || el.classList.contains('open')
  const handle = el.querySelector<HTMLElement>(':scope > .sheethandle')
  let startY = 0, dy = 0, t0 = 0, dragging = false, candidate = false

  const move = (v: number, animate: boolean) => {
    el.style.transition = animate ? 'transform .3s cubic-bezier(.2,.7,.2,1)' : 'none'
    el.style.transform = v ? `translateY(${v}px)` : ''
  }
  const reset = () => { el.style.transition = ''; el.style.transform = '' }
  const finish = () => {
    if (!dragging) return
    dragging = false
    const speed = dy / Math.max(1, performance.now() - t0)
    if (dy > 120 || (dy > 30 && speed > 0.5)) {
      move(window.innerHeight, true)
      onClose()
      setTimeout(reset, 350)   // by now the sheet is closed, so clearing the inline style does not reveal it
    } else {
      move(0, true)
      setTimeout(reset, 320)
    }
    dy = 0
  }

  // grabber: pointer events (mouse and touch)
  const down = (e: PointerEvent) => {
    if (!isMobile() || !isOpen()) return
    handle?.setPointerCapture(e.pointerId)
    startY = e.clientY; t0 = performance.now(); dy = 0; dragging = true
  }
  const pmove = (e: PointerEvent) => { if (!dragging || candidate) return; dy = Math.max(0, e.clientY - startY); move(dy, false) }
  const pup = () => finish()

  // content: touch events, only when scrolled to the top and pulling down
  const scrolled = (n: Node | null) => {
    for (let x = n as HTMLElement | null; x && x !== el.parentElement; x = x.parentElement) {
      if (x.scrollHeight > x.clientHeight && x.scrollTop > 0) return true
      if (x === el) break
    }
    return false
  }
  const ts = (e: TouchEvent) => {
    if (!isMobile() || !isOpen() || handle?.contains(e.target as Node) || scrolled(e.target as Node)) return
    startY = e.touches[0].clientY; t0 = performance.now(); dy = 0; candidate = true
  }
  const tm = (e: TouchEvent) => {
    if (!candidate) return
    const d = e.touches[0].clientY - startY
    if (!dragging) {
      if (d > 10) dragging = true
      else if (d < -6) { candidate = false; return }
      else return
    }
    e.preventDefault()
    dy = Math.max(0, d); move(dy, false)
  }
  const te = () => { candidate = false; finish() }

  handle?.addEventListener('pointerdown', down)
  handle?.addEventListener('pointermove', pmove)
  handle?.addEventListener('pointerup', pup)
  handle?.addEventListener('pointercancel', pup)
  el.addEventListener('touchstart', ts, { passive: true })
  el.addEventListener('touchmove', tm, { passive: false })
  el.addEventListener('touchend', te)
  el.addEventListener('touchcancel', te)
  return () => {
    handle?.removeEventListener('pointerdown', down); handle?.removeEventListener('pointermove', pmove)
    handle?.removeEventListener('pointerup', pup); handle?.removeEventListener('pointercancel', pup)
    el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm)
    el.removeEventListener('touchend', te); el.removeEventListener('touchcancel', te)
    reset()
  }
}

export function useSheetDrag(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const el = ref.current
    return el ? attachSheetDrag(el, () => close.current()) : undefined
  }, [ref])
}
