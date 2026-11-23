import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { cx } from "../../lib/cx"
import { DockStageContext, dockSurface, STAGE_ENTER, STAGE_EXIT, STAGE_SHIFT } from "./stage"

type Layer = { id: string; leaving: boolean; dir: number }
type Size = { width: number; height: number }

const anchored = "absolute right-0 group-data-[side=top]/dock-panel:bottom-0 group-data-[side=bottom]/dock-panel:top-0"

/**
 * The dock's panels on one surface, as Stripe's menu: switching panels keeps
 * the surface, which resizes from one panel to the next (anchored to the
 * dock), while the old content slides out toward where the pointer came from
 * and the new one slides in from where it went. Cut short, each slide
 * carries on from where it was. The first panel rides the popover's own motion.
 */
export function PanelStage({
  id,
  order,
  render,
}: {
  /** The panel to show. */
  id: string
  /** Every panel id, in the order of their buttons: sets the direction. */
  order: string[]
  render: (id: string) => ReactNode
}) {
  const [layers, setLayers] = useState<Layer[]>([{ id, leaving: false, dir: 0 }])
  const [shown, setShown] = useState(id)
  if (shown !== id) {
    const dir = Math.sign(order.indexOf(id) - order.indexOf(shown)) || 1
    setShown(id)
    setLayers((list) => [
      ...list.filter((layer) => layer.id !== id).map((layer) => ({ ...layer, leaving: true, dir })),
      { id, leaving: false, dir },
    ])
  }

  const nodes = useRef(new Map<string, HTMLDivElement>())
  const phases = useRef(new Map<string, "in" | "out">())
  const [size, setSize] = useState<Size | null>(null)
  const [morph, setMorph] = useState(false)

  // The surface takes the current panel's size: at once the first time, then resizing to it.
  useLayoutEffect(() => {
    const node = nodes.current.get(id)
    if (!node) return
    const measure = () =>
      setSize((last) =>
        last && last.width === node.offsetWidth && last.height === node.offsetHeight
          ? last
          : { width: node.offsetWidth, height: node.offsetHeight }
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [id])

  useEffect(() => {
    if (!size || morph) return
    const frame = requestAnimationFrame(() => setMorph(true))
    return () => cancelAnimationFrame(frame)
  }, [size, morph])

  useLayoutEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const shift = reduce ? 0 : STAGE_SHIFT
    const blur = reduce ? "blur(0px)" : "blur(2px)"
    for (const layer of layers) {
      const node = nodes.current.get(layer.id)
      if (!node) continue
      const was = phases.current.get(layer.id)
      const next = layer.leaving ? "out" : "in"
      if (was === next) continue
      phases.current.set(layer.id, next)
      if (was === undefined && layers.length === 1) continue
      // From wherever it is now: a slide that was cut short carries on.
      const style = getComputedStyle(node)
      const from: Keyframe = {
        opacity: style.opacity,
        transform: style.transform === "none" ? "translateX(0px)" : style.transform,
        filter: style.filter === "none" ? "blur(0px)" : style.filter,
      }
      for (const animation of node.getAnimations()) animation.cancel()
      if (next === "out") {
        const animation = node.animate(
          [from, { opacity: 0, transform: `translateX(${-layer.dir * shift}px)`, filter: blur }],
          STAGE_EXIT
        )
        animation.onfinish = () => {
          phases.current.delete(layer.id)
          setLayers((list) => list.filter((entry) => entry.id !== layer.id || !entry.leaving))
        }
      } else {
        const start: Keyframe =
          was === "out" ? from : { opacity: 0, transform: `translateX(${layer.dir * shift}px)`, filter: blur }
        node.animate([start, { opacity: 1, transform: "translateX(0px)", filter: "blur(0px)" }], STAGE_ENTER)
      }
    }
  }, [layers])

  return (
    <DockStageContext value={true}>
      {/* The popover's box: the current panel's size, so it sits and flips by it. */}
      <div aria-hidden="true" style={size ?? undefined} className="pointer-events-none" />
      <div
        style={size ?? undefined}
        className={cx(
          "ag-chrome overflow-hidden",
          anchored,
          dockSurface,
          morph && "transition-[width,height] duration-250 ease-morph motion-reduce:transition-none"
        )}
      >
        {layers.map((layer) => (
          <div
            key={layer.id}
            ref={(node) => {
              if (node) nodes.current.set(layer.id, node)
              else nodes.current.delete(layer.id)
            }}
            inert={layer.leaving}
            className={anchored}
          >
            {render(layer.id)}
          </div>
        ))}
      </div>
    </DockStageContext>
  )
}
