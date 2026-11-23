import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
  createCollapsibleController,
} from "@ui-sdk/react/collapsible"
import { Switch } from "@ui-sdk/react/switch"
import { ArrowUpRight, Info } from "lucide-react"
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react"
import { cx } from "../../lib/cx"
import type { License } from "../../lib/licenses"
import { revealDisclosure } from "../../lib/reveal"
import { CycleValue } from "../../primitives/parts"
import { InfoTip } from "../controls/InfoTip"
import { RollingText } from "./RollingText"
import { labelBase, labelClass, rowClass, rowControlClass } from "./styles"

/** Where each option sits: 3px dots stacked 2px apart, the current one white and full size. */
function CycleDots({ items, value }: { items: string[]; value: string }) {
  return (
    <span aria-hidden="true" className="flex flex-col gap-0.5">
      {items.map((item) => (
        <span
          key={item}
          className={cx(
            "size-[3px] rounded-full transition-[background-color,scale] duration-250 ease-out",
            item === value ? "scale-100 bg-chrome-text" : "scale-[0.667] bg-chrome-text/30"
          )}
        />
      ))}
    </span>
  )
}

/** Steps to the next value on each press (a cycle button): Motion, Neutrals. */
export function CycleRow({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
  disabled,
  modified,
  warning,
  ...rest
}: {
  label: string
  items: string[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  /** Changed from what's saved or in source: the label turns blue. */
  modified?: boolean
  /** Something to check about it, behind a red (!) beside the label. */
  warning?: ReactNode
  "data-force"?: string
}) {
  return (
    <div className={rowClass}>
      <span className={cx(labelBase, disabled ? "text-chrome-ghost" : modified ? "text-chrome-accent" : "text-chrome-muted")}>
        {label}
        {warning && (
          <InfoTip tone="warning" label={`Notes on ${label.toLowerCase()}`}>
            {warning}
          </InfoTip>
        )}
      </span>
      <CycleValue
        {...rest}
        items={items}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange ? (next) => onValueChange(next) : undefined}
        disabled={disabled}
        aria-label={label}
        className={rowControlClass}
      >
        {(state) => (
          <>
            <span className="sr-only">{`${label}, ${state.value}`}</span>
            <RollingText value={state.value} className="truncate" />
            <CycleDots items={items} value={state.value} />
          </>
        )}
      </CycleValue>
    </div>
  )
}

/** The switch's 24×16 track and 12px thumb; the thumb slides 8px in 150ms. */
export function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-checked={checked || undefined}
      className={cx(
        "flex h-4 w-6 shrink-0 items-center rounded-full bg-chrome-track p-0.5 transition-[background-color,opacity] duration-150",
        "data-checked:bg-chrome-accent"
      )}
    >
      <span
        className={cx(
          "size-3 rounded-full bg-white transition-transform duration-150",
          checked && "translate-x-2"
        )}
      />
    </span>
  )
}

type SwitchSide = { key: string; value: string }

/**
 * A two-state setting (role="switch"): Primary action, Typography, Icons.
 * The key on the left and the value beside the track change with the state.
 */
export function SwitchRow({
  label,
  on,
  off,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  info,
  infoLabel,
  defaultInfoOpen,
  infoForce,
  ...rest
}: {
  label: string
  on: SwitchSide
  off: SwitchSide
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  /** Licensing details behind an (i) button, for each side (projects). */
  info?: { on: License; off: License }
  infoLabel?: string
  defaultInfoOpen?: boolean
  /** Pins a state on the (i) button (playground). */
  infoForce?: string
  "data-force"?: string
}) {
  const id = useId()
  const [own, setOwn] = useState(defaultChecked)
  const isOn = checked ?? own
  const side = isOn ? on : off

  const toggle = (
    <Switch
      {...rest}
      checked={isOn}
      onCheckedChange={(next) => {
        setOwn(next)
        onCheckedChange?.(next)
      }}
      disabled={disabled}
      aria-label={label}
      aria-describedby={`${id}-value`}
      className={rowControlClass}
    >
      {(state) => {
        const current = state.checked ? on : off
        return (
          <>
            <span id={`${id}-value`} className="sr-only">{`${current.key}, ${current.value}`}</span>
            <RollingText value={current.value} className="truncate" />
            <SwitchTrack checked={state.checked} />
          </>
        )
      }}
    </Switch>
  )

  const key = (
    <span className={cx(labelBase, disabled ? "text-chrome-ghost" : "text-chrome-muted")}>
      <RollingText value={side.key} className="truncate" />
    </span>
  )

  if (!info) {
    return (
      <div className={rowClass}>
        {key}
        {toggle}
      </div>
    )
  }

  return (
    <InfoDisclosure
      id={id}
      label={infoLabel ?? `About ${label}`}
      license={isOn ? info.on : info.off}
      defaultOpen={defaultInfoOpen}
      force={infoForce}
      labelSlot={key}
    >
      {toggle}
    </InfoDisclosure>
  )
}

/**
 * The (i) after a licensed row's label and the details it opens. The icon is
 * the help glyph (white at 20%, 50% on hover); the details open with
 * the accordion easing, the panel scrolls so they fit, and Escape closes them.
 */
function InfoDisclosure({
  id,
  label,
  license,
  defaultOpen,
  force,
  labelSlot,
  children,
}: {
  id: string
  label: string
  license: License
  defaultOpen?: boolean
  force?: string
  labelSlot: ReactNode
  children: ReactNode
}) {
  const [controller] = useState(createCollapsibleController)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stopReveal = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => stopReveal.current?.(), [])

  return (
    <Collapsible
      controller={controller}
      defaultOpen={defaultOpen}
      onOpenChange={(open) => {
        stopReveal.current?.()
        stopReveal.current = undefined
        if (!open) return
        // Once the panel is in the page and measurable.
        requestAnimationFrame(() => {
          if (triggerRef.current && contentRef.current) {
            stopReveal.current = revealDisclosure(triggerRef.current, contentRef.current)
          }
        })
      }}
    >
      <div className={rowClass}>
        <span className="flex min-w-0 items-center gap-0.5">
          {labelSlot}
          <CollapsibleTrigger
            ref={triggerRef}
            id={`${id}-info-button`}
            aria-label={label}
            data-force={force}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !controller.isOpen()) return
              event.stopPropagation()
              controller.close()
            }}
            className={cx(
              "group grid size-4 shrink-0 place-items-center rounded-full text-chrome-text",
              "outline-chrome-focus fv:outline-2 fv:outline-offset-1"
            )}
          >
            <Info
              aria-hidden="true"
              absoluteStrokeWidth
              strokeWidth={1.25}
              className="size-[13px] translate-y-px opacity-20 transition-opacity duration-150 group-hov:opacity-50 group-data-open:opacity-50"
            />
          </CollapsibleTrigger>
        </span>
        {children}
      </div>
      <CollapsiblePanel
        render={<section />}
        aria-labelledby={`${id}-info-button`}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return
          event.stopPropagation()
          controller.close()
          controller.focus()
        }}
        className={cx(
          "h-(--collapsible-panel-height) overflow-hidden",
          "transition-[height,opacity] duration-300 ease-out-expo",
          "data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0",
          "motion-reduce:transition-none"
        )}
      >
        <LicenseDetails license={license} contentRef={contentRef} />
      </CollapsiblePanel>
    </Collapsible>
  )
}

/** Family, prices and a link, in the description type (11/14, light, 50%). */
export function LicenseDetails({
  license,
  contentRef,
}: {
  license: License
  contentRef?: Ref<HTMLDivElement>
}) {
  return (
    <div ref={contentRef} className="flex flex-col items-start gap-1.5 pt-1 pb-0.5 text-ag-xs font-light text-chrome-muted">
      {license.family && <span className="font-normal text-chrome-soft">{license.family}</span>}
      <dl className="m-0 grid w-full gap-1">
        {license.rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt>{row.label}</dt>
            <dd title={row.title} className="m-0 shrink-0 text-right font-normal text-chrome-soft tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <a
        href={license.link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cx(
          "inline-flex items-center gap-0.5 rounded-sm text-chrome-text/80 underline decoration-chrome-ghost decoration-dotted underline-offset-2",
          "transition-colors duration-150 hover:text-chrome-text",
          "outline-chrome-focus focus-visible:outline-2 focus-visible:outline-offset-2"
        )}
      >
        {license.link.label}
        <ArrowUpRight aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3 flex-none" />
      </a>
    </div>
  )
}

/**
 * A section of the panel (settingsSection): an optional label, then its
 * rows 8px apart. Sections after the first get a 7% divider.
 */
export function Group({
  label,
  children,
  className,
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        "flex shrink-0 flex-col gap-2 [&+&]:mt-2 [&+&]:border-t [&+&]:border-chrome-divider [&+&]:pt-2",
        className
      )}
    >
      {label && (
        <h2 className={cx(labelClass, "m-0 min-h-6")}>
          {label}
        </h2>
      )}
      {children}
    </section>
  )
}
