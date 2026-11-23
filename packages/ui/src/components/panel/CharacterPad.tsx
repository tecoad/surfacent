import { cx } from "../../lib/cx"
import type { Character } from "../../lib/data"
import { PAD_GLIDE } from "../../primitives/character-pad"
import { CharacterPadRoot, CharacterPadThumb } from "../../primitives/parts"

const word = "pointer-events-none absolute z-[1] text-ag-2xs font-medium text-chrome-text/35"

/**
 * The Character pad. x runs Quiet → Bold, y runs Compact → Airy.
 * The field look (3% fill, 10% border, 8px corners) with a marker
 * as the point. `force` pins "active" (pressed) or "focus" for the playground.
 */
export function CharacterPad({
  value,
  defaultValue,
  onValueChange,
  disabled,
  force,
}: {
  value?: Character
  defaultValue?: Character
  onValueChange?: (value: Character) => void
  disabled?: boolean
  force?: string
}) {
  return (
    <CharacterPadRoot
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => onValueChange(next) : undefined}
      disabled={disabled}
      data-force={force}
      style={{ ["--pad-glide-d" as string]: `${PAD_GLIDE.duration}ms`, ["--pad-glide-e" as string]: PAD_GLIDE.easing }}
      className={cx(
        "group relative h-[140px] w-full touch-none overflow-hidden rounded-lg border border-chrome-border bg-white/[0.03] select-none",
        "cursor-crosshair transition-[border-color] duration-150 hov:border-white/15",
        "data-disabled:cursor-not-allowed data-disabled:opacity-35"
      )}
    >
      <div aria-hidden="true" className="pad-dots absolute inset-2" />
      <span aria-hidden="true" className={cx(word, "top-0.5 left-1/2 -translate-x-1/2")}>
        Airy
      </span>
      <span aria-hidden="true" className={cx(word, "bottom-0.5 left-1/2 -translate-x-1/2")}>
        Compact
      </span>
      <span aria-hidden="true" className={cx(word, "top-1/2 left-2 -translate-x-1/2 -translate-y-1/2 -rotate-90")}>
        Quiet
      </span>
      <span aria-hidden="true" className={cx(word, "top-1/2 right-2 translate-x-1/2 -translate-y-1/2 rotate-90")}>
        Bold
      </span>
      <div className="pointer-events-none absolute inset-4">
        <CharacterPadThumb
          aria-label="Character"
          data-force={force}
          className={cx(
            "absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chrome-accent",
            "shadow-[0_2px_6px_rgb(0_0_0/0.2),inset_0_0_0_1px_rgb(0_0_0/0.04)]",
            "transition-[scale] duration-100 ease-[ease] group-hov:scale-110 group-act:scale-110 group-data-disabled:scale-100",
            "group-data-gliding:[transition-property:inset-inline-start,top,scale]",
            "group-data-gliding:[transition-duration:var(--pad-glide-d),var(--pad-glide-d),100ms]",
            "group-data-gliding:[transition-timing-function:var(--pad-glide-e),var(--pad-glide-e),ease]",
            "outline-chrome-focus fv:outline-2 fv:outline-offset-3"
          )}
        />
      </div>
    </CharacterPadRoot>
  )
}
