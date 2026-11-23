import {
  createChange,
  createController,
  definePrimitive,
  type ChangeDetails,
} from "@ui-sdk/core"
import { easeGlide } from "../lib/motion"

/** Pixels per color: a 20px circle and its 8px gap, as in the toolbar's color options. */
const SWATCH = 28
/** The snap to a color: the settle easing, 360ms on cubic-bezier(.19, 1, .22, 1). */
const SNAP_MS = 360
/** Per-ms friction of a fling: 0.95 per 60fps frame. */
const FRICTION = -Math.log(0.95) / (1000 / 60)
const REST_SPEED = 8.333e-4
/** A press must travel this far before it drags. */
const DRAG_THRESHOLD = 3

type WheelReason = "drag" | "step-key" | "track-press" | "wheel" | "imperative"

type ColorWheelOptions = {
  /** Index of the selected color. */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number, details: ChangeDetails<WheelReason>) => void
  colors?: string[]
  /** Each color's name, for the value assistive tech reads out. */
  labels?: string[]
  disabled?: boolean
  controller?: ColorWheelController
}

type ColorWheelController = ReturnType<typeof createColorWheelController>

/** Drives a mounted color wheel from elsewhere, like the hex field's ✓. */
function createColorWheelController() {
  return createController<{
    /** Glides to a color by the shortest way round. */
    scrollTo: (index: number) => void
    /** Index of the color under the frame. */
    current: () => number
  }>()
}

const wrap = (index: number, length: number) =>
  length ? ((index % length) + length) % length : 0

/**
 * The brand color strip, as Graphical builds it: a continuous position that
 * follows a drag, coasts after a fling and snaps to the nearest swatch in
 * 280ms. Pressing a swatch glides to it; the wheel scrolls; arrows step one,
 * Page Up/Down eight, Home/End go to the ends.
 */
const colorWheel = definePrimitive({
  name: "color-wheel",
  options: {
    value: "number",
    defaultValue: "number",
    onValueChange: "callback",
    colors: "list",
    labels: "list",
    disabled: "boolean",
    controller: "value",
  },
  controlled: ["value"],
  state: (options: ColorWheelOptions) => {
    const value = options.value ?? options.defaultValue ?? 0
    return {
      value,
      colors: options.colors ?? [],
      labels: options.labels ?? [],
      disabled: options.disabled ?? false,
      /** Continuous position along the strip, in swatches. */
      position: value,
      dragging: false,
    }
  },
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    colors: options.colors ?? [],
    labels: options.labels ?? [],
    disabled: options.disabled ?? false,
  }),
  api: (context) => {
    const { store } = context
    const change = createChange(context)
    let frame = 0
    let wheelTimer: ReturnType<typeof setTimeout> | undefined
    let root: HTMLElement | null = null
    let drag:
      | { pointerId: number; x: number; start: number; moved: boolean; samples: { x: number; t: number }[] }
      | null = null

    const stopMotion = () => {
      cancelAnimationFrame(frame)
      clearTimeout(wheelTimer)
    }
    context.onDestroy(stopMotion)

    /** Moves the strip; reports a new color as soon as one is under the frame. */
    const place = (position: number, reason: WheelReason, event?: Event) => {
      const { colors, value } = store.get()
      store.set({ position })
      const index = wrap(Math.round(position), colors.length)
      if (index !== value) change("value", index, { reason, event })
    }

    const glide = (target: number, reason: WheelReason, event?: Event) => {
      stopMotion()
      const from = store.get().position
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / SNAP_MS)
        place(from + (target - from) * easeGlide(t), reason, event)
        if (t < 1) frame = requestAnimationFrame(step)
        else place(target, reason, event)
      }
      frame = requestAnimationFrame(step)
    }

    const snap = (reason: WheelReason) => glide(Math.round(store.get().position), reason)

    /** After a fling: decay the speed, then snap to the nearest swatch. */
    const coast = (velocity: number) => {
      if (Math.abs(velocity) < REST_SPEED) return snap("drag")
      const from = store.get().position
      const start = performance.now()
      const step = (now: number) => {
        const elapsed = now - start
        const decay = Math.exp(-FRICTION * elapsed)
        place(from + (velocity * (1 - decay)) / FRICTION, "drag")
        if (Math.abs(velocity * decay) < REST_SPEED) snap("drag")
        else frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }

    /** Pixels per ms over the last 100ms of the drag, faded if the pointer rested. */
    const releaseVelocity = (samples: { x: number; t: number }[], at: number) => {
      const recent = samples.filter((sample) => at - sample.t <= 100)
      if (recent.length < 2) return 0
      const first = recent[0]
      const last = recent[recent.length - 1]
      const idle = at - last.t
      if (idle >= 100 || last.t === first.t) return 0
      return ((last.x - first.x) / (last.t - first.t)) * Math.min(1, (100 - idle) / 68)
    }

    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      event.preventDefault()
      drag.samples = [...drag.samples, { x: event.clientX, t: event.timeStamp }].slice(-12)
      const dx = event.clientX - drag.x
      if (Math.abs(dx) > DRAG_THRESHOLD) drag.moved = true
      if (drag.moved) place(drag.start - dx / SWATCH, "drag", event)
    }

    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      const current = drag
      drag = null
      store.set({ dragging: false })
      document.removeEventListener("pointermove", onMove, true)
      document.removeEventListener("pointerup", onUp, true)
      document.removeEventListener("pointercancel", onCancel, true)
      if (current.moved || Math.abs(event.clientX - current.x) > DRAG_THRESHOLD) {
        place(current.start - (event.clientX - current.x) / SWATCH, "drag", event)
        coast(-releaseVelocity(current.samples, event.timeStamp) / SWATCH)
      } else if (root) {
        // A press without a drag picks the swatch under the pointer.
        const rect = root.getBoundingClientRect()
        const target = Math.round(store.get().position + (event.clientX - rect.left - rect.width / 2) / SWATCH)
        glide(target, "track-press", event)
      }
    }

    const onCancel = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      drag = null
      store.set({ dragging: false })
      document.removeEventListener("pointermove", onMove, true)
      document.removeEventListener("pointerup", onUp, true)
      document.removeEventListener("pointercancel", onCancel, true)
      snap("drag")
    }

    // Follow a value the app sets: jump there, as Graphical does.
    context.onOptions((options) => {
      if (options.value === undefined || drag) return
      const { position, colors } = store.get()
      if (wrap(Math.round(position), colors.length) !== options.value) {
        stopMotion()
        store.set({ position: options.value })
      }
    })

    return {
      bindRoot(el: HTMLElement) {
        root = el
        return () => {
          root = null
        }
      },
      pointerdown(event: PointerEvent, el: HTMLElement) {
        if (store.get().disabled || event.button !== 0 || drag) return
        event.preventDefault()
        el.focus({ preventScroll: true })
        stopMotion()
        drag = {
          pointerId: event.pointerId,
          x: event.clientX,
          start: store.get().position,
          moved: false,
          samples: [{ x: event.clientX, t: event.timeStamp }],
        }
        store.set({ dragging: true })
        document.addEventListener("pointermove", onMove, { capture: true, passive: false })
        document.addEventListener("pointerup", onUp, true)
        document.addEventListener("pointercancel", onCancel, true)
      },
      wheel(event: WheelEvent) {
        if (event.ctrlKey || store.get().disabled) return
        event.preventDefault()
        cancelAnimationFrame(frame)
        clearTimeout(wheelTimer)
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 256 : 1
        place(store.get().position + (delta * unit) / SWATCH, "wheel", event)
        wheelTimer = setTimeout(() => snap("wheel"), 140)
      },
      keydown(event: KeyboardEvent) {
        const { colors, position } = store.get()
        const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 8, PageDown: -8 }
        let target: number | null = null
        if (event.key in steps) target = Math.round(position) + steps[event.key]
        else if (event.key === "Home") target = 0
        else if (event.key === "End") target = colors.length - 1
        if (target === null) return
        event.preventDefault()
        glide(target, "step-key", event)
      },
      setValue: (index: number) => glide(index, "imperative"),
      scrollTo(index: number) {
        const { position, colors } = store.get()
        const length = colors.length
        const from = Math.round(position)
        const delta = ((index - wrap(from, length) + length / 2 + length) % length) - length / 2
        glide(from + Math.round(delta), "imperative")
      },
      current: () => wrap(Math.round(store.get().position), store.get().colors.length),
    }
  },
  slots: (slot) => ({
    root: slot<
      {},
      {
        value: number
        position: number
        colors: string[]
        labels: string[]
        dragging: boolean
        disabled: boolean
      }
    >({
      role: "slider",
      focus: "tab-stop",
      keys: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"],
      state: (state) => ({
        value: state.value,
        position: state.position,
        colors: state.colors,
        labels: state.labels,
        dragging: state.dragging,
        disabled: state.disabled,
      }),
      attrs: (state) => ({
        tabindex: state.disabled ? "-1" : "0",
        "aria-valuemin": "0",
        "aria-valuemax": String(Math.max(0, state.colors.length - 1)),
        "aria-valuenow": String(state.value),
        "aria-valuetext": `${state.labels[state.value] ?? state.colors[state.value] ?? ""}, color ${state.value + 1} of ${state.colors.length}`,
        "aria-orientation": "horizontal",
        "aria-disabled": state.disabled ? "true" : undefined,
        "data-dragging": state.dragging ? "" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
      }),
      on: {
        pointerdown: (event, { el, api }) => {
          if (el) api.pointerdown(event as PointerEvent, el)
        },
        keydown: (event, { api }) => api.keydown(event as KeyboardEvent),
      },
      bind: (el, { api }) => {
        const unbind = api.bindRoot(el)
        const onWheel = (event: WheelEvent) => api.wheel(event)
        el.addEventListener("wheel", onWheel, { passive: false })
        return () => {
          unbind()
          el.removeEventListener("wheel", onWheel)
        }
      },
    }),
  }),
  agent: { actions: ["setValue"] },
})

export {
  colorWheel,
  createColorWheelController,
  SWATCH,
  wrap,
  type ColorWheelController,
  type ColorWheelOptions,
  type WheelReason,
}
