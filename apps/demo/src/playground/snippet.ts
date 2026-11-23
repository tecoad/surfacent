/**
 * The Code tab's source, built the way the plez playground builds it: a
 * state's imports, optional setup and JSX, printed paste-ready. The UI comes
 * from `surfacent-ui`, so the code compiles in any app of this repo.
 */

export interface ImportLine {
  from: string
  names: string[]
  /** `import type { … }`. */
  type?: boolean
}

export interface Snippet {
  imports: ImportLine[]
  /** Hooks, state and data the JSX reads. With it the code is wrapped in a component. */
  setup?: string[]
  jsx: string
  /** "tsx" (the default) or "css". CSS prints as it is, with no imports. */
  language?: "tsx" | "css"
}

export type PropValue = string | number | boolean | undefined
type PrintedProp = string | number | true

const LINE_WIDTH = 80
const MAX_INLINE_TAG = 72
const INDENT = "  "

/** An import from the UI package. */
export function ui(...names: string[]): ImportLine {
  return { from: "surfacent-ui", names }
}

/** A type-only import from the UI package. */
export function uiType(...names: string[]): ImportLine {
  return { from: "surfacent-ui", names, type: true }
}

export const USE_STATE: ImportLine = { from: "react", names: ["useState"] }

function importStatement({ from, names, type }: ImportLine) {
  const keyword = type ? "import type" : "import"
  const inline = `${keyword} { ${names.join(", ")} } from "${from}"`
  if (inline.length <= LINE_WIDTH) return inline
  return `${keyword} {\n${names.map((name) => `${INDENT}${name},`).join("\n")}\n} from "${from}"`
}

/** Merged per module, names sorted; modules by name, types after values. */
function mergeImports(lines: ImportLine[]) {
  const byModule = new Map<string, Set<string>>()
  for (const { from, names, type } of lines) {
    const key = `${type ? "1" : "0"}${from}`
    const merged = byModule.get(key) ?? new Set<string>()
    for (const name of names) merged.add(name)
    byModule.set(key, merged)
  }
  return [...byModule]
    .map(([key, names]) => ({
      from: key.slice(1),
      type: key[0] === "1",
      names: [...names].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.from.localeCompare(b.from) || Number(a.type) - Number(b.type))
}

function indent(text: string, depth = 1) {
  const pad = INDENT.repeat(depth)
  return text
    .split("\n")
    .map((line) => (line ? `${pad}${line}` : line))
    .join("\n")
}

function formatProp(name: string, value: PrintedProp) {
  // A spread prints as it is: `{...TYPOGRAPHY}`.
  if (name.startsWith("{")) return name
  if (value === true) return name
  if (typeof value === "number") return `${name}={${value}}`
  if (value.startsWith("{")) return `${name}=${value}`
  if (value.includes('"')) return `${name}={${JSON.stringify(value)}}`
  return `${name}="${value}"`
}

/**
 * Prints a JSX element. `false`/`undefined` props drop, `true` prints a bare
 * prop, a string in braces prints as an expression (`"{setTheme}"`), a key in
 * braces is a spread (`{ "{...ICONS}": true }`), and long tags break one prop
 * per line.
 */
export function jsx(tag: string, props: Record<string, PropValue> = {}, children?: string) {
  const attributes = Object.entries(props)
    .filter((entry): entry is [string, PrintedProp] => entry[1] !== false && entry[1] !== undefined)
    .map(([name, value]) => formatProp(name, value))
  const selfClosing = children === undefined
  const inline = `<${[tag, ...attributes].join(" ")}${selfClosing ? " />" : ">"}`
  const opening =
    !inline.includes("\n") && inline.length <= MAX_INLINE_TAG
      ? inline
      : `<${tag}\n${indent(attributes.join("\n"))}\n${selfClosing ? "/>" : ">"}`
  if (selfClosing) return opening

  const closing = `</${tag}>`
  const oneLine = `${opening}${children}${closing}`
  if (!oneLine.includes("\n") && oneLine.length <= LINE_WIDTH) return oneLine
  return `${opening}\n${indent(children)}\n${closing}`
}

/** Siblings, one per line. */
export function lines(...nodes: string[]) {
  return nodes.join("\n")
}

/** Prints the whole source. With setup, the JSX goes inside `export function <name>()`. */
export function snippetSource(snippet: Snippet, componentName: string) {
  if (snippet.language === "css") return snippet.jsx
  const imports = mergeImports(snippet.imports).map(importStatement).join("\n")
  if (!snippet.setup) return `${imports}\n\n${snippet.jsx}`
  const body = snippet.jsx.includes("\n") ? `(\n${indent(snippet.jsx, 2)}\n${INDENT})` : snippet.jsx
  return [
    imports,
    "",
    `export function ${componentName}() {`,
    indent(snippet.setup.join("\n")),
    `${INDENT}return ${body}`,
    "}",
  ].join("\n")
}

/** "Motion and Neutrals" → "MotionAndNeutralsExample". */
export function exampleName(title: string) {
  const words = title.replace(/[^A-Za-z0-9 ]+/g, " ").trim().split(/\s+/)
  return `${words.map((word) => word[0].toUpperCase() + word.slice(1)).join("")}Example`
}
