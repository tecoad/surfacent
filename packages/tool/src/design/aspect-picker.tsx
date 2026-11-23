import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { tokenized, valueTokens } from "surfacent-core";
import { useState, type ReactNode } from "react";
import {
  AdjustSlider,
  Chips,
  ColorControl,
  cx,
  CycleRow,
  dropdownButton,
  InfoTip,
  labelBase,
  menuBody,
  menuPopup,
  optionRow,
  ScrollArea,
  ToggleRow,
} from "surfacent-ui";
import { aspects, inspectElement, type Aspect, type AspectChanges, type ModifierGroup } from "./aspects";
import { originalValue } from "./preview";

export type AspectPickerProps = {
  /** Element being edited, to show the value it has in source. */
  element?: Element | null;
  changes: AspectChanges;
  /** `undefined` drops the change, `null` removes the attribute. */
  onChange: (key: string, value: string | null | undefined) => void;
  /**
   * Hover preview. `undefined` ends it. `tried` is the hovered value, so the
   * element can also show that state (a response simulates hover, focus, press).
   */
  onPreview?: (key: string, value: string | null | undefined, tried?: string) => void;
  /** Shorter, for the saved note's card, which also holds the note and its actions. */
  compact?: boolean;
};

/** A single-value aspect with up to this many values steps through them with a cycle button; more go in a menu. */
const MAX_CYCLE = 4;
/** The label for no value. */
const NOT_SET = "Not set";
/** No value, as a menu or scale option: never a real token, since tokens can't hold spaces. */
const NONE = "not set";

/** Tokens in registry order, joined; `null` when none are left. */
function join(aspect: Aspect, tokens: Iterable<string>): string | null {
  return valueTokens(aspect, [...tokens].join(" ")).join(" ") || null;
}

/** The one value of a single-value aspect, without its modifiers. */
function mainValue(aspect: Aspect, value: string | null): string | null {
  return valueTokens(aspect, value).find((token) => aspect.values.some((option) => option.value === token)) ?? null;
}

function modifiersOf(aspect: Aspect, value: string | null): string[] {
  return valueTokens(aspect, value).filter((token) => aspect.modifiers.some((option) => option.value === token));
}

/**
 * What picking `option` leaves on the element: that value with the modifiers
 * there are, or, for values that combine, the set with it toggled. Picking the
 * one value there is changes nothing. `undefined` means "same as source".
 */
function valueAfter(aspect: Aspect, current: string | null, source: string | null, option: string) {
  let next: string | null;
  if (aspect.multiple) {
    const tokens = new Set(valueTokens(aspect, current));
    if (tokens.has(option)) tokens.delete(option);
    else tokens.add(option);
    next = join(aspect, tokens);
  } else {
    next = join(aspect, [option, ...modifiersOf(aspect, current)]);
  }
  return next === source ? undefined : next;
}

/**
 * What moving a scale's slider to `option` leaves. The default is what the
 * element is without the attribute, so picking it removes the attribute.
 * `undefined` means "same as source".
 */
function scaleAfter(source: string | null, option: string, fallback: string | null) {
  const next = option === fallback && source !== option ? null : option;
  return next === source ? undefined : next;
}

/** What the element is without the attribute, if anything. */
function defaultFor(aspect: Aspect, element: Element | null | undefined): string | null {
  return element && aspect.defaultOf ? aspect.defaultOf(element) : (aspect.defaultValue ?? null);
}

/** What a click on a modifier leaves: the value with that modifier toggled. */
function modifierAfter(aspect: Aspect, current: string | null, source: string | null, modifier: string) {
  const main = mainValue(aspect, current);
  if (!main) return undefined;
  const modifiers = new Set(modifiersOf(aspect, current));
  if (modifiers.has(modifier)) modifiers.delete(modifier);
  else modifiers.add(modifier);
  const next = join(aspect, [main, ...modifiers]);
  return next === source ? undefined : next;
}

/** What choosing in a group of modifiers that exclude one another leaves: the value with that one of them, or none. */
function groupAfter(aspect: Aspect, current: string | null, source: string | null, group: ModifierGroup, choice: string) {
  const main = mainValue(aspect, current);
  if (!main) return undefined;
  const others = modifiersOf(aspect, current).filter((modifier) => !group.values.includes(modifier));
  const next = join(aspect, [main, ...others, ...(group.values.includes(choice) ? [choice] : [])]);
  return next === source ? undefined : next;
}

/**
 * A single-value aspect with many values (text roles) as a menu: browsing it
 * previews each value on the page, picking one keeps it.
 */
function ValueMenu({
  label,
  items,
  value,
  onPick,
  onBrowse,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string | null;
  onPick: (value: string) => void;
  /** The highlighted value while the menu is open, then null. */
  onBrowse: (value: string | null) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => next !== null && onPick(next as string)}
      onHighlight={(next) => onBrowse((next as string | null) ?? null)}
      onOpenChange={(open) => !open && onBrowse(null)}
    >
      <SelectTrigger
        aria-label={label}
        className="group flex h-6 w-full min-w-0 items-center rounded-md bg-chrome-control text-left outline-none"
      >
        <span className={cx(dropdownButton, "max-w-none flex-1 justify-between")}>
          <SelectValue className="min-w-0 truncate" placeholder="Not set" />
          <ChevronsUpDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 shrink-0 opacity-60" />
        </span>
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4} className={cx(menuPopup, "w-(--anchor-width)")}>
        <ScrollArea tabIndex={-1} contentClassName={menuBody}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} label={item.label} className={optionRow}>
              {item.label}
              <SelectItemIndicator className="absolute right-1.5 flex text-white">
                <Check aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
              </SelectItemIndicator>
            </SelectItem>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

/**
 * One row per aspect: surface, color, response, corners… each with the
 * control its values call for: segments for a few choices, swatches for
 * colors, a menu for many, chips for values that combine and for modifiers, a
 * slider for scales. Hovering a value previews it on the page; picking keeps
 * it. Pointer previews use mouse over/out, which fire inside the toolbar's
 * shadow root.
 */
export function AspectPicker({ element, changes, onChange, onPreview, compact }: AspectPickerProps) {
  // What the pointer is over. Its description shows under the rows.
  const [hovered, setHovered] = useState<{ key: string; value: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  return (
    <div data-aspect-picker="" className="flex min-h-0 flex-col gap-3">
    {/* 6px of room all round (taken back by the margin) for outset controls and focus rings: nothing is cut, nothing scrolls sideways. */}
    <ScrollArea
      className={cx("-m-1.5", compact ? "max-h-[min(32vh,260px)]" : "max-h-[min(52vh,460px)]")}
      contentClassName="flex flex-col p-1.5"
    >
      {aspects.map((aspect) => {
        const rawOriginal = element ? originalValue(element, aspect.attribute) : null;
        // Token lists compare normalized ("click hover" = "hover click").
        const original = tokenized(aspect) ? join(aspect, valueTokens(aspect, rawOriginal)) : rawOriginal;
        const changed = aspect.key in changes;
        const current = changed ? (changes[aspect.key] ?? null) : original;
        const tokensOf = (value: string | null) => (tokenized(aspect) ? valueTokens(aspect, value) : value ? [value] : []);
        const main = mainValue(aspect, current);

        // Values that are colors show as swatches; their hint carries the name.
        const swatches = aspect.values.every((option) => option.swatch);
        // Without the attribute an element is its default value, if the aspect has one.
        const fallback = defaultFor(aspect, element);
        const effective = main ?? fallback;
        const describe = (token: string | null | undefined) => {
          const option = [...aspect.values, ...aspect.modifiers].find((candidate) => candidate.value === token);
          if (!option) return undefined;
          return swatches || aspect.modifiers.includes(option) ? `${option.label}: ${option.description}` : option.description;
        };
        const noneHint = `Not set: no ${aspect.attribute} on this element.`;
        // What the CSS can't see around the element (read from the page as previewed), behind a red (!) by the label.
        const notes = element && aspect.inspect ? inspectElement(element, [aspect.key]) : [];
        const warning =
          notes.length > 0 ? (
            <div className="grid gap-1.5">
              {notes.map((note) => (
                <p key={note} className="m-0">
                  {note}
                </p>
              ))}
            </div>
          ) : undefined;

        const endPreview = () => {
          setHovered(null);
          setHint(null);
          onPreview?.(aspect.key, undefined);
        };
        /** The pointer is over `token`: preview what pressing it would leave. */
        const tryValue = (token: string | null) => {
          if (token === null) return endPreview();
          if (hovered?.key === aspect.key && hovered.value === token) return;
          setHovered({ key: aspect.key, value: token });
          if (token === NONE) {
            setHint(noneHint);
            onPreview?.(aspect.key, null);
            return;
          }
          setHint(describe(token) ?? aspect.description);
          if (aspect.multiple) {
            // Show what this value does: the set with it on, in its state.
            onPreview?.(aspect.key, join(aspect, [...tokensOf(current), token]), token);
          } else {
            const after = valueAfter(aspect, current, original, token);
            onPreview?.(aspect.key, after === undefined ? original : after, token);
          }
        };
        const tryModifier = (token: string | null) => {
          if (token === null || !main) return endPreview();
          if (hovered?.key === aspect.key && hovered.value === token) return;
          setHovered({ key: aspect.key, value: token });
          setHint(describe(token) ?? aspect.description);
          // Show what the modifier does: the value with it on.
          onPreview?.(aspect.key, join(aspect, [main, ...modifiersOf(aspect, current), token]), token);
        };
        /** Back to no attribute: removes it, or drops the change when the source has none. */
        const clear = () => onChange(aspect.key, original ? null : undefined);
        const press = (token: string) => (token === NONE ? clear() : onChange(aspect.key, valueAfter(aspect, current, original, token)));

        // A few single values step with the kit's cycle button: Not set, then each value, then around.
        const cycle = !aspect.ordered && !aspect.multiple && !swatches && aspect.values.length <= MAX_CYCLE;
        const cycleLabels = [NOT_SET, ...aspect.values.map((option) => option.label)];
        const cycleLabel = aspect.values.find((option) => option.value === main)?.label ?? NOT_SET;
        const tokenOf = (label: string) => aspect.values.find((option) => option.label === label)?.value ?? null;
        /**
         * The pointer is over the cycle: describe the value it shows. Each press
         * applies the next value live, so the page never shows one value while
         * the cycle says another.
         */
        const describeCycle = () => setHint(describe(main) ?? aspect.description);

        let control: ReactNode;
        if (aspect.ordered) {
          // The default is what no attribute gives; without one, the scale starts at Not set.
          const scale = fallback ? aspect.values : [{ value: NONE, label: NOT_SET }, ...aspect.values];
          control = (
            <div onKeyDown={(event) => event.stopPropagation()}>
              <AdjustSlider
                ariaLabel={aspect.label}
                value={Math.max(0, scale.findIndex((option) => option.value === (effective ?? NONE)))}
                min={0}
                max={scale.length - 1}
                step={1}
                stops={scale.length}
                display={(index) => {
                  const option = scale[index];
                  return option ? `${option.label}${!main && option.value === fallback ? " · default" : ""}` : "";
                }}
                onValueChange={(index) => {
                  const option = scale[index];
                  if (!option) return;
                  if (option.value === NONE) clear();
                  else onChange(aspect.key, scaleAfter(original, option.value, fallback));
                }}
              />
            </div>
          );
        } else if (aspect.multiple) {
          control = (
            <Chips
              grow
              label={aspect.label}
              items={aspect.values.map((option) => ({ value: option.value, label: option.label }))}
              value={tokensOf(current)}
              onPress={press}
              onItemHover={tryValue}
            />
          );
        } else if (swatches) {
          // The kit's color strip (#/color), its colors fixed (no +): Not set first. A pointer
          // over a swatch previews it; pressing, dragging or the arrows pick.
          const tokens = [NONE, ...aspect.values.map((option) => option.value)];
          control = (
            <div onKeyDown={(event) => event.stopPropagation()}>
              <ColorControl
                label={aspect.label}
                colors={["", ...aspect.values.map((option) => option.swatch!)]}
                labels={[NOT_SET, ...aspect.values.map((option) => option.label)]}
                value={Math.max(0, tokens.indexOf(main ?? NONE))}
                onValueChange={(index) => press(tokens[index]!)}
                onItemHover={(index) => tryValue(index === null ? null : tokens[index]!)}
              />
            </div>
          );
        } else if (!cycle) {
          control = (
            <ValueMenu
              label={aspect.label}
              items={[{ value: NONE, label: NOT_SET }, ...aspect.values.map((option) => ({ value: option.value, label: option.label }))]}
              value={main ?? NONE}
              onPick={press}
              onBrowse={tryValue}
            />
          );
        }

        return (
          <section
            key={aspect.key}
            className="flex flex-col gap-1.5 py-2.5 first:pt-0 [&+&]:border-t [&+&]:border-chrome-divider"
          >
            {cycle ? (
              // The kit's cycle row: the label (blue once changed), and the value that steps on each press.
              <div
                onMouseOver={describeCycle}
                onMouseOut={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHint(null);
                }}
              >
                <CycleRow
                  label={aspect.label}
                  modified={changed}
                  warning={warning}
                  items={cycleLabels}
                  value={cycleLabel}
                  onValueChange={(label) => press(tokenOf(label) ?? NONE)}
                />
              </div>
            ) : (
              <>
                {/* Blue once changed from source. */}
                <span
                  className={cx(
                    "flex min-h-5 items-center gap-0.5 text-ag-sm font-medium",
                    changed ? "text-chrome-accent" : "text-chrome-soft",
                  )}
                >
                  {aspect.label}
                  {warning && (
                    <InfoTip tone="warning" label={`Notes on ${aspect.label.toLowerCase()}`}>
                      {warning}
                    </InfoTip>
                  )}
                </span>
                {control}
              </>
            )}
            {/* Modifiers, once there's a value to modify. Those that exclude one another (a text's ink) are chips, one on at most… */}
            {aspect.modifierGroups.map((group) => {
              const choiceOf = (value: string | null) => group.values.find((token) => tokensOf(value).includes(token)) ?? null;
              const chosen = choiceOf(current);
              const labelOf = (token: string) => aspect.modifiers.find((option) => option.value === token)?.label ?? token;
              return (
                <div
                  key={group.label}
                  onMouseOver={() => {
                    if (!main) setHint(`Pick a ${aspect.label.toLowerCase()} first: ${group.label.toLowerCase()} modifies it.`);
                  }}
                  onMouseOut={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) endPreview();
                  }}
                  className="flex flex-col gap-1.5"
                >
                  <span
                    className={cx(
                      labelBase,
                      !main ? "text-chrome-ghost" : chosen !== choiceOf(original) ? "text-chrome-accent" : "text-chrome-muted",
                    )}
                  >
                    {group.label}
                  </span>
                  {/* One at most: pressing another moves to it, pressing the one that's on clears it (none is the default). */}
                  <Chips
                    grow
                    label={`${aspect.label} ${group.label.toLowerCase()}`}
                    items={group.values.map((token) => ({ value: token, label: labelOf(token), disabled: !main }))}
                    value={chosen ? [chosen] : []}
                    onPress={(token) =>
                      onChange(aspect.key, groupAfter(aspect, current, original, group, token === chosen ? NONE : token))
                    }
                    onItemHover={(token) => {
                      if (token === null || !main) return endPreview();
                      if (hovered?.key === aspect.key && hovered.value === token) return;
                      setHovered({ key: aspect.key, value: token });
                      setHint(describe(token) ?? aspect.description);
                      const others = modifiersOf(aspect, current).filter((modifier) => !group.values.includes(modifier));
                      onPreview?.(aspect.key, join(aspect, [main, ...others, token]), token);
                    }}
                  />
                </div>
              );
            })}
            {/* …and any other is on or off (a color's tint). */}
            {aspect.modifiers.filter((option) => !aspect.modifierGroups.some((group) => group.values.includes(option.value))).map((option) => (
              <div
                key={option.value}
                onMouseOver={() => {
                  if (main) tryModifier(option.value);
                  else setHint(`Pick a ${aspect.label.toLowerCase()} first: ${option.label.toLowerCase()} modifies it.`);
                }}
                onMouseOut={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) endPreview();
                }}
              >
                <ToggleRow
                  label={option.label}
                  checked={tokensOf(current).includes(option.value)}
                  modified={tokensOf(current).includes(option.value) !== tokensOf(original).includes(option.value)}
                  disabled={!main}
                  onCheckedChange={() => onChange(aspect.key, modifierAfter(aspect, current, original, option.value))}
                />
              </div>
            ))}
          </section>
        );
      })}
    </ScrollArea>
      {/* One description for every row: what the pointer is over, three lines tall so nothing moves. */}
      <p
        aria-live="polite"
        className={cx(
          "m-0 line-clamp-3 h-[50px] shrink-0 border-t border-chrome-divider pt-2 text-ag-xs font-light",
          hint ? "text-chrome-soft" : "text-chrome-faint",
        )}
      >
        {hint ?? "Hover a value to preview it on the page and see what it does."}
      </p>
    </div>
  );
}
