import { easeOutExpo } from "./motion"

/**
 * Scrolls the panel so a disclosure that just opened fits, with the
 * disclosure's own motion (300ms ease-out-expo), never so far that the trigger
 * leaves the top, stopped by the user's own wheel or touch, and a jump under
 * reduced motion. Returns a function that stops the scroll.
 */
export function revealDisclosure(trigger: HTMLElement, content: HTMLElement) {
  const scroller = content.closest<HTMLElement>("[data-panel-scroll]")
  if (!scroller) return
  const style = getComputedStyle(scroller)
  const box = scroller.getBoundingClientRect()
  const top = content.getBoundingClientRect().top
  const delta = Math.min(
    top + content.scrollHeight - (box.bottom - (parseFloat(style.scrollPaddingBottom) || 0)),
    trigger.getBoundingClientRect().top - (box.top + (parseFloat(style.scrollPaddingTop) || 0))
  )
  if (delta < 1) return
  const from = scroller.scrollTop
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scroller.scrollTop = from + delta
    return
  }

  const start = performance.now()
  let frame = 0
  const stop = () => {
    cancelAnimationFrame(frame)
    scroller.removeEventListener("wheel", stop)
    scroller.removeEventListener("touchstart", stop)
  }
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 300)
    scroller.scrollTop = from + delta * easeOutExpo(t)
    if (t < 1) frame = requestAnimationFrame(step)
    else stop()
  }
  frame = requestAnimationFrame(step)
  scroller.addEventListener("wheel", stop, { passive: true })
  scroller.addEventListener("touchstart", stop, { passive: true })
  return stop
}
