import type { CssRules } from "./types.ts";

/**
 * Parent-relative values without custom-property cycles.
 *
 * A raised surface is "one step lighter than what it sits on", a nested corner
 * is "the parent radius minus the parent padding". Both need each element to
 * read a value that its nearest ancestor in the same aspect computed. CSS can't
 * read the inherited value of a property the element also sets, so every
 * participating element at exact depth k stores its value in a depth slot
 * (`--<name>-<k>`), and reads its parent's value from slot k-1. Exact depth is
 * matched with `:not()`, so each element matches a single slot rule.
 *
 * Ariakit Tailwind solves the same problem with even/odd contexts and style
 * container queries. Depth slots need neither, at the cost of a maximum depth.
 */
export function nestingChain({
  selector,
  values,
  depth = 12,
}: {
  /** Participating elements, e.g. `[data-surface]`. */
  selector: string;
  /**
   * Chained properties (without dashes) and the parent value of top-level
   * elements, e.g. `{ "surface-l": "var(--tone-ground)" }`. Each element
   * computes `--<name>` and reads its parent's as `--<name>-parent`.
   */
  values: Record<string, string>;
  /** Nesting levels supported. */
  depth?: number;
}): CssRules {
  const rules: CssRules = {};
  const chain = (count: number) => Array<string>(count).fill(selector).join(" ");
  for (let k = 1; k <= depth; k++) {
    const exact = k < depth ? `${chain(k)}:not(${chain(k + 1)})` : chain(k);
    const declarations: Record<string, string> = {};
    for (const [name, root] of Object.entries(values)) {
      declarations[`--${name}-parent`] = k === 1 ? root : `var(--${name}-${k - 1})`;
      declarations[`--${name}-${k}`] = `var(--${name})`;
    }
    rules[exact] = declarations;
  }
  return rules;
}

/**
 * Registers a custom property so math resolves to a typed value at each
 * element instead of growing as a token string down the tree.
 */
export function property(
  name: string,
  { syntax = "<number>", inherits = true, initial }: { syntax?: string; inherits?: boolean; initial: string },
): CssRules {
  return {
    [`@property --${name}`]: {
      syntax: `"${syntax}"`,
      inherits: String(inherits),
      "initial-value": initial,
    },
  };
}
