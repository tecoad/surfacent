import { Switch } from "@ui-sdk/react/switch"
import type { ReactNode } from "react"
import { cx } from "../../lib/cx"
import { SwitchTrack } from "../panel/rows"
import { labelBase, rowClass, rowControlClass } from "../panel/styles"
import { InfoTip } from "./InfoTip"

/**
 * A setting that's on or off: the label on the left (with its description
 * behind a ?), the switch on the right. A ui-sdk Switch.
 */
export function ToggleRow({
  label,
  help,
  checked,
  onCheckedChange,
  disabled,
  modified,
}: {
  label: string
  help?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** Changed from what's saved or in source: the label turns blue. */
  modified?: boolean
}) {
  return (
    <div className={rowClass}>
      <span className={cx(labelBase, disabled ? "text-chrome-ghost" : modified ? "text-chrome-accent" : "text-chrome-muted")}>
        <span className="truncate">{label}</span>
        {help && <InfoTip label={`About ${label.toLowerCase()}`}>{help}</InfoTip>}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className={cx(rowControlClass, "pr-0.5 pl-0.5")}
      >
        {(state) => <SwitchTrack checked={state.checked} />}
      </Switch>
    </div>
  )
}
