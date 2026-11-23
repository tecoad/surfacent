import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox"
import { FileInput, FileInputDropzone, FileInputTrigger } from "@ui-sdk/react/file-input"
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from "@ui-sdk/react/select"
import { Check, ChevronDown, SlidersHorizontal, Upload } from "lucide-react"
import { useState } from "react"
import { cx } from "../../lib/cx"
import { CURATED_FONTS, GOOGLE_FONTS, type FontOption, type FontRole } from "../../lib/edit-data"
import { ScrollArea } from "../ScrollArea"
import { dropdownButton, fieldWell, fontMenu, labelText, menuBody, menuPopup, optionMeta, optionRow } from "./styles"
import { CompactBar, CompactNumber } from "./ValueField"

type Source = "curated" | "google" | "custom"

const SOURCES = [
  { value: "curated", label: "Curated" },
  { value: "google", label: "Google" },
  { value: "custom", label: "Custom" },
]

/** "Curated ⇅": where the list comes from. */
function SourceSelect({ value, onValueChange }: { value: Source; onValueChange: (value: Source) => void }) {
  return (
    <Select items={SOURCES} value={value} onValueChange={(next) => next && onValueChange(next as Source)}>
      <SelectTrigger
        aria-label="Font source"
        className={cx(
          "flex h-6 w-full items-center justify-between rounded-md px-2 font-chrome text-ag font-medium text-chrome-text",
          "transition-colors duration-150 hov:bg-white/8 data-open:bg-white/8",
          "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
        )}
      >
        <SelectValue />
        <ChevronDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 opacity-60" />
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4} className={cx(menuPopup, "w-(--anchor-width)")}>
        <ScrollArea tabIndex={-1} contentClassName={menuBody}>
          {SOURCES.map((source) => (
            <SelectItem key={source.value} value={source.value} label={source.label} className={optionRow}>
              {source.label}
              <SelectItemIndicator className="absolute right-1.5 flex text-white">
                <Check aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
              </SelectItemIndicator>
            </SelectItem>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  )
}

/** Custom fonts: a drop zone that takes font files. */
export function FontUpload() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-1 pt-1 pb-1">
      <FileInput accept=".woff2,.woff,.ttf,.otf" multiple maxSize={10 * 1024 * 1024} className="flex flex-[1_0_112px]">
        <FileInputDropzone
          className={cx(
            "group flex w-full min-h-28 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed border-chrome-border p-3",
            "transition-[background-color,border-color] duration-150 hov:border-white/15 hov:bg-white/[0.04]",
            "data-dragging:border-chrome-accent data-dragging:bg-chrome-accent/10"
          )}
        >
          <FileInputTrigger
            aria-label="Add custom fonts"
            className="flex flex-col items-center gap-1 rounded-md font-chrome text-ag font-medium text-chrome-text/85 outline-chrome-focus fv:outline-2 fv:outline-offset-2"
          >
            <Upload aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="mb-0.5 size-4 text-chrome-text/35" />
            <span>Add fonts</span>
            <span className="text-ag-xs font-light text-chrome-muted">or drag and drop</span>
          </FileInputTrigger>
        </FileInputDropzone>
      </FileInput>
      <p className="m-0 px-1 text-ag-xs font-light text-chrome-muted">Add WOFF2, WOFF, TTF, or OTF files up to 10 MB each.</p>
    </div>
  )
}

/** The menu that opens from a font row: source, search, list or upload. */
export function FontMenuBody({
  source,
  onSourceChange,
  fonts,
  autoFocus = true,
}: {
  source: Source
  onSourceChange: (source: Source) => void
  fonts: FontOption[]
  autoFocus?: boolean
}) {
  return (
    <>
      <div className="shrink-0 px-1 pt-1">
        <SourceSelect value={source} onValueChange={onSourceChange} />
      </div>
      {source === "custom" ? (
        <FontUpload />
      ) : (
        <>
          <div className={cx(fieldWell, "m-1 flex h-6 shrink-0 items-center")}>
            <ComboboxInput
              autoFocus={autoFocus}
              aria-label={`Search ${source} fonts`}
              placeholder="Search"
              className="h-full w-full min-w-0 bg-transparent px-2 font-chrome text-ag-sm text-chrome-text outline-none placeholder:text-chrome-text/30"
            />
          </div>
          <ComboboxEmpty className="px-3 py-2 text-ag-xs font-light text-chrome-muted">No fonts found.</ComboboxEmpty>
          <ScrollArea tabIndex={-1} className="flex-1" contentClassName="px-1 pb-1">
            <ComboboxList aria-label={`${source === "google" ? "Google" : "Curated"} fonts`}>
              {fonts.map((font) => (
                <ComboboxItem key={font.name} value={font.name} label={font.name} className={cx(optionRow, "whitespace-nowrap")}>
                  <span className="min-w-0 flex-1 truncate" style={{ fontFamily: font.family }}>
                    {font.name}
                  </span>
                  {source === "curated" && <span className={optionMeta}>{font.paid ? "Paid" : "Free"}</span>}
                  <ComboboxItemIndicator className="absolute right-1.5 flex text-white">
                    <Check aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
                  </ComboboxItemIndicator>
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ScrollArea>
        </>
      )}
    </>
  )
}

/** Regular, Medium and Heavy weights in one compact bar. */
export function FontWeights({
  role,
  weights,
  onWeightsChange,
  force,
}: {
  role: string
  weights: FontRole["weights"]
  onWeightsChange: (weights: FontRole["weights"]) => void
  force?: string
}) {
  const fields = [
    ["regular", "Regular"],
    ["medium", "Medium"],
    ["heavy", "Heavy"],
  ] as const
  return (
    <fieldset aria-label={`${role} font weights`} className="m-0 ml-auto w-[136px] min-w-0 border-0 p-0">
      <CompactBar columns={3} shift={4}>
        {fields.map(([key, label], index) => (
          <CompactNumber
            key={key}
            label={`${role} ${label.toLowerCase()} weight`}
            caption={label}
            value={weights[key]}
            onValueChange={(next) => onWeightsChange({ ...weights, [key]: next })}
            min={100}
            max={900}
            step={100}
            force={index === 0 ? force : undefined}
          />
        ))}
      </CompactBar>
    </fieldset>
  )
}

/**
 * A font row: role, the chosen family (opens a searchable menu) and a toggle
 * for its weights. ui-sdk Combobox with the input inside the popup,
 * a nested Select for the source, FileInput for uploads, Collapsible for weights.
 */
export function FontPicker({
  value,
  onValueChange,
  open,
  onOpenChange,
  defaultWeightsOpen,
  defaultSource = "curated",
  defaultQuery = "",
  pinnedMenu,
  force,
}: {
  value: FontRole
  onValueChange: (value: FontRole) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultWeightsOpen?: boolean
  defaultSource?: Source
  defaultQuery?: string
  /** Keeps the font menu open (playground). */
  pinnedMenu?: boolean
  /** Pins states for the playground: { trigger, toggle }. */
  force?: { trigger?: string; toggle?: string }
}) {
  const [source, setSource] = useState<Source>(defaultSource)
  const [query, setQuery] = useState(defaultQuery)
  // The search field lives in the popup, so the popup anchors to the trigger.
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const all = source === "google" ? GOOGLE_FONTS : CURATED_FONTS
  const fonts = query ? all.filter((font) => font.name.toLowerCase().includes(query.trim().toLowerCase())) : all

  return (
    <Collapsible defaultOpen={defaultWeightsOpen} className="flex flex-col">
      <div className="grid min-h-6 grid-cols-[minmax(0,1fr)_24px] items-center gap-1">
        <Combobox
          value={value.font}
          onValueChange={(next) => next && onValueChange({ ...value, font: next as string })}
          query={query}
          onQueryChange={setQuery}
          open={pinnedMenu || open}
          modal={pinnedMenu ? false : undefined}
          onOpenChange={(next, details) => {
            if (pinnedMenu) return details.cancel()
            if (next) setQuery("")
            onOpenChange?.(next)
          }}
        >
          <ComboboxTrigger
            ref={setAnchor}
            aria-label={`${value.role} font, ${value.font}`}
            data-force={force?.trigger}
            className="group flex h-6 min-w-0 items-center gap-2 text-left outline-none"
          >
            <span className={cx(labelText, "flex-1 truncate")}>{value.role}</span>
            <span className={dropdownButton}>
              <span className="min-w-0 truncate">{value.font}</span>
              <ChevronDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 shrink-0 opacity-60" />
            </span>
          </ComboboxTrigger>
          <ComboboxContent
            anchor={anchor}
            side="bottom"
            align="end"
            sideOffset={6}
            // A pinned menu (playground) never flips above its row.
            collisionPadding={pinnedMenu ? -4000 : undefined}
            className={fontMenu}
          >
            <FontMenuBody source={source} onSourceChange={setSource} fonts={fonts} autoFocus={!pinnedMenu} />
          </ComboboxContent>
        </Combobox>
        <CollapsibleTrigger
          aria-label={`${value.role} font weights`}
          data-force={force?.toggle}
          className={cx(
            "grid size-6 place-items-center rounded-md text-chrome-faint transition-[background-color,color] duration-150",
            "hov:bg-chrome-hover hov:text-chrome-text/80 data-open:bg-chrome-selected data-open:text-chrome-text",
            "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
          )}
        >
          <SlidersHorizontal aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
        </CollapsibleTrigger>
      </div>
      <CollapsiblePanel className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-out-expo data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0 motion-reduce:transition-none">
        <div className="pt-2">
          <FontWeights
            role={value.role}
            weights={value.weights}
            onWeightsChange={(weights) => onValueChange({ ...value, weights })}
          />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}
