import { Input } from "@ui-sdk/react/input"
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from "@ui-sdk/react/popover"
import { Toggle } from "@ui-sdk/react/toggle"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { cx } from "../../lib/cx"
import { bezierAt, curvePath, formatCurve, parseCurve, springAt, type Curve } from "../../lib/easing"
import type { Motion } from "../../lib/edit-data"
import { VIEW } from "../../primitives/easing-curve"
import { EasingCurveHandle, EasingCurveRoot } from "../../primitives/parts"
import { AdjustSlider } from "./AdjustSlider"
import { Segmented } from "./Segmented"
import { ScrollArea } from "../ScrollArea"
import { closeButton, fieldRow, fieldWell, labelText, panelBody, panelPopup, popupHeader, popupTitle } from "./styles"

/** The graph well: the field look, a little taller. */
const graph = "w-full rounded-md border border-chrome-border bg-white/[0.03]"
import { ValueField } from "./ValueField"

const TYPES = [
  { value: "easing", label: "Easing" },
  { value: "spring", label: "Spring" },
]

/** The curve as a 16px sparkline, for the row. */
export function Sparkline({ motion }: { motion: Motion }) {
  const at = motion.type === "spring" ? (x: number) => springAt(motion.bounce, x) : (x: number) => bezierAt(motion.curve, x)
  return (
    <svg viewBox="0 0 256 160" preserveAspectRatio="none" aria-hidden="true" className="size-4 shrink-0">
      <path
        d={curvePath(at, { x: 16, y: 20, width: 224, height: 120 })}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** The cubic-bezier editor: reference diagonal, tangents, curve and two handles. */
export function EasingEditor({
  curve,
  onCurveChange,
  label,
  force,
}: {
  curve: Curve
  onCurveChange: (curve: Curve) => void
  label: string
  force?: { handle: number; state: string }
}) {
  const [x1, y1, x2, y2] = curve
  const P = (x: number, y: number) => [VIEW.x0 + x * VIEW.size, VIEW.y0 - y * VIEW.size] as const
  const [sx, sy] = P(0, 0)
  const [ex, ey] = P(1, 1)
  const [h1x, h1y] = P(x1, y1)
  const [h2x, h2y] = P(x2, y2)
  return (
    <div className={cx(graph, "h-36")}>
      <EasingCurveRoot
        value={curve}
        onValueChange={(next) => onCurveChange(next as Curve)}
        aria-label={`${label} easing curve`}
        className="relative size-full"
      >
        <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <line x1={sx} y1={sy} x2={ex} y2={ey} className="stroke-white/15" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={sx} y1={sy} x2={h1x} y2={h1y} className="stroke-white/30" strokeWidth={1} />
          <line x1={ex} y1={ey} x2={h2x} y2={h2y} className="stroke-white/30" strokeWidth={1} />
          <path
            d={`M ${sx} ${sy} C ${h1x} ${h1y}, ${h2x} ${h2y}, ${ex} ${ey}`}
            className="fill-none stroke-chrome-accent"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <circle cx={sx} cy={sy} r={2} className="fill-white/40" />
          <circle cx={ex} cy={ey} r={2} className="fill-white/40" />
        </svg>
        {[0, 1].map((index) => (
          <EasingCurveHandle
            key={index}
            index={index}
            value={`handle-${index}`}
            data-force={force?.handle === index ? force.state : undefined}
            className={cx(
              "easing-handle absolute grid size-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center rounded-full select-none",
              "data-dragging:z-[1] data-dragging:cursor-grabbing outline-chrome-focus fv:outline-2 fv:-outline-offset-4"
            )}
          />
        ))}
      </EasingCurveRoot>
    </div>
  )
}

/** The spring's response over time, for the Spring type. */
function SpringGraph({ bounce }: { bounce: number }) {
  const box = { x: 24, y: 24, width: 248, height: 112 }
  return (
    <svg viewBox="0 0 296 160" aria-hidden="true" className={cx(graph, "h-36")}>
      <line x1={box.x + box.width * 0.48} y1={16} x2={box.x + box.width * 0.48} y2={144} className="stroke-white/15" strokeWidth={1} strokeDasharray="3 3" />
      <path d={curvePath((x) => springAt(bounce, x), box, 96)} className="fill-none stroke-chrome-accent" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

/** A preview that plays the motion: a switch for small, a drawer for large. */
function MotionPreview({ motion }: { motion: Motion }) {
  const [on, setOn] = useState(true)
  const easing = motion.type === "spring" ? "cubic-bezier(.3,1.35,.4,1)" : `cubic-bezier(${motion.curve.join(",")})`
  const transition = `${motion.duration}ms ${easing}`
  useEffect(() => {
    const timer = setInterval(() => setOn((value) => !value), Math.max(900, motion.duration * 4))
    return () => clearInterval(timer)
  }, [motion.duration])

  return (
    <Toggle
      pressed={on}
      onPressedChange={setOn}
      aria-label={motion.id === "small" ? "Toggle switch preview" : "Toggle drawer preview"}
      className={cx(graph, "grid h-28 cursor-pointer place-items-center overflow-hidden p-3 outline-chrome-focus fv:outline-2 fv:outline-offset-2")}
    >
      {motion.id === "small" ? (
        // The settings switch, at twice its size.
        <span className="relative h-8 w-12 rounded-full bg-chrome-track">
          <span className="absolute inset-0 rounded-[inherit] bg-chrome-accent" style={{ opacity: on ? 1 : 0, transition: `opacity ${transition}` }} />
          <span
            className="absolute top-1 left-1 size-6 rounded-full bg-white"
            style={{ translate: on ? "16px 0" : "0 0", transition: `translate ${transition}` }}
          />
        </span>
      ) : (
        <span className="relative h-24 w-[168px] max-w-full overflow-hidden rounded-lg bg-chrome-surface shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
          <span className="absolute inset-0 bg-black/30" style={{ opacity: on ? 1 : 0, transition: `opacity ${transition}` }} />
          <span
            className="absolute inset-x-0 bottom-0 grid min-h-14 content-start gap-1.5 rounded-t-lg bg-[#252525] px-3 pt-1.5 pb-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]"
            style={{ translate: on ? "0 0" : "0 100%", transition: `translate ${transition}` }}
          >
            <span className="mb-1 h-0.5 w-5 justify-self-center rounded bg-white/20" />
            <span className="h-1 w-16 rounded bg-white/10" />
            <span className="h-1 w-11 rounded bg-white/10" />
          </span>
        </span>
      )}
    </Toggle>
  )
}

/** Everything inside the motion popup. */
export function MotionPanel({
  motion,
  onMotionChange,
  force,
}: {
  motion: Motion
  onMotionChange: (motion: Motion) => void
  force?: { handle: number; state: string }
}) {
  // While typing, the field holds the draft; otherwise it shows the curve.
  const [draft, setDraft] = useState<string | null>(null)
  const name = motion.id === "small" ? "Small" : "Large"

  const commitDraft = () => {
    const parsed = draft === null ? null : parseCurve(draft)
    if (parsed) onMotionChange({ ...motion, curve: parsed })
    setDraft(null)
  }

  return (
    <>
      <header className="grid">
        <div className={popupHeader}>
          <PopoverTitle className={popupTitle}>{motion.title}</PopoverTitle>
          <PopoverClose aria-label={`Close ${motion.title.toLowerCase()}`} className={closeButton}>
            <X aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
          </PopoverClose>
        </div>
        <p className="m-0 mt-0.5 text-ag-xs font-light text-chrome-muted">{motion.description}</p>
      </header>
      <div className={fieldRow}>
        <span className={labelText}>Type</span>
        <Segmented
          label={`${name} motion type`}
          items={TYPES}
          value={motion.type}
          onValueChange={(type) => onMotionChange({ ...motion, type: type as Motion["type"] })}
        />
      </div>
      {motion.type === "easing" ? (
        <>
          <EasingEditor curve={motion.curve} onCurveChange={(curve) => onMotionChange({ ...motion, curve })} label={name} force={force} />
          <div className={fieldRow}>
            <span className={labelText}>Curve</span>
            <div className={cx(fieldWell, "flex h-6")}>
              <Input
                aria-label={`${name} easing coordinates`}
                value={draft ?? formatCurve(motion.curve)}
                onValueChange={setDraft}
                onBlur={commitDraft}
                onKeyDown={(event) => event.key === "Enter" && commitDraft()}
                className="h-full w-full min-w-0 bg-transparent px-2 font-chrome text-ag-sm font-medium text-chrome-text tabular-nums outline-none"
              />
            </div>
          </div>
        </>
      ) : (
        <SpringGraph bounce={motion.bounce} />
      )}
      <ValueField
        label="Duration"
        ariaLabel={`${name} animation duration`}
        unit="ms"
        value={motion.duration}
        onValueChange={(duration) => onMotionChange({ ...motion, duration })}
        min={0}
        max={5000}
        step={25}
      />
      {motion.type === "spring" && (
        <AdjustSlider
          label="Bounce"
          ariaLabel={`${name} spring bounce`}
          value={motion.bounce}
          onValueChange={(bounce) => onMotionChange({ ...motion, bounce })}
          min={0}
          max={100}
          display={(v) => `${v}%`}
          stops={9}
        />
      )}
      <MotionPreview motion={motion} />
    </>
  )
}

/** A motion row: label and a button with the sparkline, type and duration. */
export function MotionField({
  motion,
  onMotionChange,
  pinnedOpen,
  force,
}: {
  motion: Motion
  onMotionChange: (motion: Motion) => void
  pinnedOpen?: boolean
  force?: string
}) {
  const name = motion.id === "small" ? "Small" : "Large"
  return (
    <div className={cx(fieldRow, "relative")}>
      <span className={labelText}>{name}</span>
      <Popover open={pinnedOpen || undefined} onOpenChange={pinnedOpen ? (_open, details) => details.cancel() : undefined}>
        <PopoverTrigger
          aria-label={`Edit ${name.toLowerCase()} motion`}
          data-force={force}
          className={cx(
            "-mr-1.5 flex h-6 min-w-0 items-center gap-1.5 rounded-md px-1.5 font-chrome text-ag font-medium text-chrome-text",
            "transition-colors duration-150 hov:bg-white/8 data-open:bg-white/8",
            "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
          )}
        >
          <span className="text-chrome-faint">
            <Sparkline motion={motion} />
          </span>
          <span className="flex-1 text-left">{motion.type === "spring" ? "Spring" : "Easing"}</span>
          <span className="text-ag-sm whitespace-nowrap text-chrome-muted tabular-nums">{motion.duration} ms</span>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="start"
          sideOffset={20}
          inline={pinnedOpen}
          className={cx(panelPopup, pinnedOpen && "absolute top-0 right-[calc(100%+20px)] z-10")}
        >
          <ScrollArea contentClassName={panelBody}>
            <MotionPanel motion={motion} onMotionChange={onMotionChange} />
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
