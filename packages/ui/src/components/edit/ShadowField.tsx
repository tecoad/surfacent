import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from "@ui-sdk/react/popover"
import { X } from "lucide-react"
import { cx } from "../../lib/cx"
import { shadowCss, SHADOW_POSITIONS, SHADOW_STYLES, type Shadow } from "../../lib/edit-data"
import { AdjustSlider } from "./AdjustSlider"
import { ColorSelect } from "./ColorSelect"
import { ScrollArea } from "../ScrollArea"
import { closeButton, fieldRow, labelText, panelBody, panelPopup, popupHeader, popupTitle } from "./styles"
import { TokenSelect } from "./TokenSelect"
import { ValueField } from "./ValueField"

/** Everything inside the shadow popup. */
export function ShadowPanel({
  shadow,
  onShadowChange,
}: {
  shadow: Shadow
  onShadowChange: (shadow: Shadow) => void
}) {
  const id = shadow.id.toUpperCase()
  const set = <K extends keyof Shadow>(key: K, value: Shadow[K]) => onShadowChange({ ...shadow, [key]: value })
  return (
    <>
      <header className={popupHeader}>
        <PopoverTitle className={popupTitle}>{`${id} Shadow`}</PopoverTitle>
        <PopoverClose aria-label={`Close shadow ${shadow.id}`} className={closeButton}>
          <X aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
        </PopoverClose>
      </header>
      <div aria-label={`Shadow ${id} preview`} className="grid h-24 place-items-center overflow-hidden rounded-md bg-[#fdfdfc]">
        <span className="h-10 w-16 rounded-lg bg-white" style={{ boxShadow: shadowCss(shadow) }} />
      </div>
      <TokenSelect
        label="Position"
        ariaLabel={`Shadow ${id} position`}
        options={SHADOW_POSITIONS}
        value={shadow.position}
        onValueChange={(position) => set("position", position as Shadow["position"])}
      />
      <TokenSelect
        label="Style"
        ariaLabel={`Shadow ${id} style`}
        options={SHADOW_STYLES}
        value={shadow.style}
        onValueChange={(style) => set("style", style as Shadow["style"])}
      />
      <ColorSelect
        label="Color"
        ariaLabel={`Shadow ${id} color`}
        color={shadow.color}
        onColorChange={(color) => set("color", color)}
        opacity={shadow.colorOpacity}
        onOpacityChange={(colorOpacity) => set("colorOpacity", colorOpacity)}
      />
      <AdjustSlider
        label="Opacity"
        ariaLabel={`Shadow ${id} opacity`}
        value={shadow.opacity}
        onValueChange={(opacity) => set("opacity", opacity)}
        min={0}
        max={100}
        display={(v) => `${v}%`}
        stops={9}
      />
      <div className="grid gap-2">
        <ValueField label="X" ariaLabel={`Shadow ${id} horizontal`} unit="px" value={shadow.x} onValueChange={(v) => set("x", v)} min={-128} max={128} step={0.5} />
        <ValueField label="Y" ariaLabel={`Shadow ${id} vertical`} unit="px" value={shadow.y} onValueChange={(v) => set("y", v)} min={-128} max={128} step={0.5} />
        <ValueField label="Blur" ariaLabel={`Shadow ${id} blur`} unit="px" value={shadow.blur} onValueChange={(v) => set("blur", v)} min={0} max={256} step={0.5} />
        <ValueField label="Spread" ariaLabel={`Shadow ${id} spread`} unit="px" value={shadow.spread} onValueChange={(v) => set("spread", v)} min={-128} max={128} step={0.5} />
      </div>
    </>
  )
}

/** A shadow row: label and a button with a thumbnail, name and opacity. */
export function ShadowField({
  shadow,
  onShadowChange,
  pinnedOpen,
  force,
}: {
  shadow: Shadow
  onShadowChange: (shadow: Shadow) => void
  pinnedOpen?: boolean
  force?: string
}) {
  const id = shadow.id.toUpperCase()
  return (
    <div className={cx(fieldRow, "relative")}>
      <span className={labelText}>{id}</span>
      <Popover open={pinnedOpen || undefined} onOpenChange={pinnedOpen ? (_open, details) => details.cancel() : undefined}>
        <PopoverTrigger
          aria-label={`Edit shadow ${shadow.id}`}
          data-force={force}
          className={cx(
            "-mr-1.5 flex h-6 min-w-0 items-center gap-1.5 rounded-md px-1.5 font-chrome text-ag font-medium text-chrome-text",
            "transition-colors duration-150 hov:bg-white/8 data-open:bg-white/8",
            "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
          )}
        >
          <span aria-hidden="true" className="grid h-4 w-5 shrink-0 place-items-center overflow-hidden rounded-[3px] bg-[#fdfdfc]">
            <span className="h-2 w-2.5 rounded-[2px] bg-white" style={{ boxShadow: shadowCss({ ...shadow, x: shadow.x / 4, y: shadow.y / 4, blur: shadow.blur / 4 }) }} />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{`${id} Shadow`}</span>
          <span className="text-ag-sm text-chrome-muted tabular-nums">{shadow.opacity}%</span>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="start"
          sideOffset={20}
          inline={pinnedOpen}
          className={cx(panelPopup, pinnedOpen && "absolute top-0 right-[calc(100%+20px)] z-10")}
        >
          <ScrollArea contentClassName={panelBody}>
            <ShadowPanel shadow={shadow} onShadowChange={onShadowChange} />
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
