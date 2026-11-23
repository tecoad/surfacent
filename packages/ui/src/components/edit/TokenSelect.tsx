import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { Check, ChevronsUpDown } from "lucide-react"
import { cx } from "../../lib/cx"
import { ScrollArea } from "../ScrollArea"
import { dropdownButton, labelText, menuBody, menuPopup, optionMeta, optionRow } from "./styles"

export type TokenOption = { value: string; label: string; meta?: string }

/** One option of a token menu: label, optional meta on the right, a check when chosen. */
export function TokenOptionRow({
  option,
  force,
}: {
  option: TokenOption
  force?: string
}) {
  return (
    <SelectItem
      value={option.value}
      label={option.label}
      data-force={force}
      className={cx(optionRow, "data-[force~=hover]:bg-chrome-hover")}
    >
      <span className="min-w-0 truncate">{option.label}</span>
      {option.meta && <span className={optionMeta}>{option.meta}</span>}
      <SelectItemIndicator className="absolute right-1.5 flex text-white">
        <Check aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
      </SelectItemIndicator>
    </SelectItem>
  )
}

/**
 * A labelled select (Family: Central ⇅). The whole row is the trigger, its
 * value drawn as a dropdown button; the menu drops under it. ui-sdk Select: typeahead, arrows, Home/End.
 */
export function TokenSelect({
  label,
  ariaLabel,
  options,
  value,
  defaultValue,
  onValueChange,
  open,
  onOpenChange,
  pinned,
  disabled,
  force,
}: {
  label: string
  ariaLabel?: string
  options: TokenOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Keeps the menu open (playground). */
  pinned?: boolean
  disabled?: boolean
  force?: string
}) {
  return (
    <Select
      modal={pinned ? false : undefined}
      items={options}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => next !== null && onValueChange(next as string) : undefined}
      open={pinned || open}
      onOpenChange={(next, details) => (pinned ? details.cancel() : onOpenChange?.(next))}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel ?? label}
        data-force={force}
        className="group flex min-h-6 w-full items-center justify-between gap-3 rounded-md text-left outline-none data-disabled:cursor-not-allowed data-disabled:opacity-35"
      >
        <span className={cx(labelText, "min-w-0 truncate")}>{label}</span>
        <span className={cx(dropdownButton, "-mr-2")}>
          <SelectValue className="min-w-0 truncate" />
          <ChevronsUpDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 shrink-0 opacity-60" />
        </span>
      </SelectTrigger>
      <SelectContent
        side="bottom"
        align="end"
        sideOffset={6}
        collisionPadding={pinned ? -4000 : undefined}
        className={cx(menuPopup, "min-w-[160px]")}
      >
        <ScrollArea tabIndex={-1} contentClassName={menuBody}>
          {options.map((option) => (
            <TokenOptionRow key={option.value} option={option} />
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  )
}
