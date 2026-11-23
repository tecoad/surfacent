// Maps a position in a module the dev server transformed back to the file the
// developer wrote, through the inline source map Vite serves with each module.
// React 19 only knows where an element was created in the transformed code.

interface RawSourceMap {
  sources: string[];
  mappings: string;
}

export interface OriginalPosition {
  /** As the map names it: usually the file's base name. */
  source: string;
  /** 1-based. */
  line: number;
  /** 1-based, like the columns in stack traces and editors. */
  column: number;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const DIGIT = new Map([...BASE64].map((char, index) => [char, index]));

/** Decodes one segment's base64 VLQ numbers. */
function decodeSegment(segment: string): number[] {
  const values: number[] = [];
  let value = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = DIGIT.get(char);
    if (digit === undefined) return values;
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      values.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

/**
 * The original position of a generated `line` and `column` (both 1-based, as
 * a stack trace prints them): the last mapping at or before that column.
 */
export function originalPosition(map: RawSourceMap, line: number, column: number): OriginalPosition | null {
  const lines = map.mappings.split(";");
  // Source index, line and column are relative to the previous segment, across lines.
  let source = 0;
  let sourceLine = 0;
  let sourceColumn = 0;
  let found: OriginalPosition | null = null;
  for (let index = 0; index < lines.length && index < line; index++) {
    let generatedColumn = 0;
    for (const segment of lines[index]!.split(",")) {
      if (!segment) continue;
      const [columnDelta, sourceDelta, lineDelta, sourceColumnDelta] = decodeSegment(segment);
      generatedColumn += columnDelta ?? 0;
      if (sourceDelta === undefined) continue;
      source += sourceDelta;
      sourceLine += lineDelta ?? 0;
      sourceColumn += sourceColumnDelta ?? 0;
      if (index === line - 1 && generatedColumn <= column - 1) {
        found = { source: map.sources[source] ?? "", line: sourceLine + 1, column: sourceColumn + 1 };
      }
    }
  }
  return found;
}

/** The map inlined at the end of a served module, if any. */
export function inlineSourceMap(code: string): RawSourceMap | null {
  const match = code.match(/\/\/[#@] sourceMappingURL=data:application\/json[^,]*;base64,([A-Za-z0-9+/=]+)\s*$/);
  if (!match) return null;
  try {
    const json = new TextDecoder().decode(Uint8Array.from(atob(match[1]!), (char) => char.charCodeAt(0)));
    const map = JSON.parse(json) as Partial<RawSourceMap>;
    return Array.isArray(map.sources) && typeof map.mappings === "string" ? (map as RawSourceMap) : null;
  } catch {
    return null;
  }
}

const maps = new Map<string, Promise<RawSourceMap | null>>();

/** Fetches the module the stack frame points into (the dev server answers from its cache) and maps the position. */
export async function mapToSource(url: string, line: number, column: number): Promise<OriginalPosition | null> {
  let map = maps.get(url);
  if (!map) {
    map = fetch(url)
      .then((response) => (response.ok ? response.text() : ""))
      .then(inlineSourceMap, () => null);
    maps.set(url, map);
  }
  const loaded = await map;
  return loaded ? originalPosition(loaded, line, column) : null;
}
