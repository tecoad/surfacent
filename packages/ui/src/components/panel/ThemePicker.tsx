import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover"
import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle"
import { ChevronDown, X } from "lucide-react"
import { useState, type CSSProperties } from "react"
import { cx } from "../../lib/cx"
import { THEMES, themeName, type ThemeId } from "../../lib/data"
import { ScrollArea } from "../ScrollArea"
import {
  choiceClass,
  iconButtonClass,
  labelClass,
  popupBodyClass,
  popupClass,
  popupTitleClass,
  rowClass,
  dropdownTriggerClass,
} from "./styles"

/** A preset's sample button, shrunk to a 20×16 item icon. */
function chipPreview(chip: CSSProperties): CSSProperties {
  const radius = typeof chip.borderRadius === "number" ? chip.borderRadius : 4
  return {
    background: chip.background,
    color: chip.color,
    boxShadow: chip.boxShadow,
    borderRadius: Math.min(radius / 2, 8),
  }
}

/** The theme presets, as one vertical group of toggles: ↑/↓ move, Enter picks. */
export function ThemeChoices({
  value,
  onValueChange,
  force,
}: {
  value: ThemeId
  onValueChange: (value: ThemeId) => void
  /** Pins states on choices, for the playground: { felt: "hover" }. */
  force?: Partial<Record<ThemeId, string>>
}) {
  return (
    <ToggleGroup
      aria-label="Themes"
      orientation="vertical"
      value={[value]}
      deselectable={false}
      onValueChange={(next) => {
        const picked = next[0] as ThemeId | undefined
        if (picked) onValueChange(picked)
      }}
      className="flex flex-col gap-px"
    >
      {THEMES.map((theme) => (
        <Toggle
          key={theme.id}
          value={theme.id}
          aria-label={`Use ${theme.name} theme`}
          data-force={force?.[theme.id]}
          className={cx("group", choiceClass)}
        >
          <span
            aria-hidden="true"
            style={chipPreview(theme.chip)}
            className="grid h-4 w-5 shrink-0 place-items-center overflow-hidden text-[8px]/none font-semibold"
          >
            Aa
          </span>
          <span className="min-w-0 truncate text-ag/none font-medium text-chrome-soft group-data-pressed:font-semibold group-data-pressed:text-chrome-text">
            {theme.name}
          </span>
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

export function ThemesHeader() {
  return (
    <header className="-mb-1 flex h-6 items-center justify-between gap-3">
      <PopoverTitle className={popupTitleClass}>Themes</PopoverTitle>
      <PopoverClose aria-label="Close themes" className={cx("-mr-1", iconButtonClass)}>
        <X aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
      </PopoverClose>
    </header>
  )
}

/** The row that opens the Themes popup to the left of the panel. */
export function ThemePicker({
  value,
  onValueChange,
  open: openProp,
  onOpenChange,
  pinned,
  inline,
  force,
}: {
  value: ThemeId
  onValueChange: (value: ThemeId) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Keeps the popup open whatever happens (playground). */
  pinned?: boolean
  /** Renders the popup in the layout instead of the top layer (playground). */
  inline?: boolean
  force?: string
}) {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = pinned || (openProp ?? ownOpen)
  const setOpen = (next: boolean) => {
    if (pinned) return
    setOwnOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        if (pinned) details.cancel()
        else setOpen(next)
      }}
    >
      <div className={rowClass}>
        <span className={labelClass}>Theme</span>
        <PopoverTrigger
          aria-label="Theme"
          aria-description={themeName(value)}
          data-force={force}
          className={dropdownTriggerClass}
        >
          <span className="truncate">{themeName(value)}</span>
          <ChevronDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4 flex-none opacity-60" />
        </PopoverTrigger>
      </div>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={20}
        inline={inline}
        className={cx(popupClass, "w-[200px]", inline && "absolute top-0 right-[calc(100%+20px)]")}
      >
        <ScrollArea contentClassName={cx(popupBodyClass, "gap-2")}>
          <ThemesHeader />
          <ThemeChoices
            value={value}
            onValueChange={(next) => {
              onValueChange(next)
              setOpen(false)
            }}
          />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
