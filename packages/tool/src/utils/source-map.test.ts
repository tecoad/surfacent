import { afterEach, describe, expect, it, vi } from "vitest";
import { inlineSourceMap, mapToSource, originalPosition } from "./source-map";

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Encodes numbers as a base64 VLQ segment, the way bundlers write source maps. */
function vlq(...values: number[]): string {
  return values
    .map((value) => {
      let rest = value < 0 ? (-value << 1) | 1 : value << 1;
      let out = "";
      do {
        let digit = rest & 31;
        rest >>>= 5;
        if (rest > 0) digit |= 32;
        out += BASE64[digit];
      } while (rest > 0);
      return out;
    })
    .join("");
}

// Generated line 1: two segments, at columns 0 and 10 → source lines 1 and 3.
// Generated line 2: empty. Generated line 3: column 4 → source line 49, column 6 (0-based).
const map = {
  sources: ["ColorLab.tsx"],
  mappings: [
    `${vlq(0, 0, 0, 0)},${vlq(10, 0, 2, 2)}`,
    "",
    // Relative to the previous segment (source line 2, column 2).
    vlq(4, 0, 46, 4),
  ].join(";"),
};

describe("originalPosition", () => {
  it("maps a stack trace position (1-based) to the source's line and column (1-based)", () => {
    expect(originalPosition(map, 3, 5)).toEqual({ source: "ColorLab.tsx", line: 49, column: 7 });
  });

  it("takes the last mapping at or before the column", () => {
    expect(originalPosition(map, 1, 1)).toEqual({ source: "ColorLab.tsx", line: 1, column: 1 });
    expect(originalPosition(map, 1, 30)).toEqual({ source: "ColorLab.tsx", line: 3, column: 3 });
  });

  it("finds nothing on a line without mappings or before the first one", () => {
    expect(originalPosition(map, 2, 1)).toBeNull();
    expect(originalPosition(map, 3, 2)).toBeNull();
  });
});

describe("inlineSourceMap", () => {
  it("reads the base64 map Vite appends to a module", () => {
    const code = `export const a = 1;\n//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(map))}\n`;
    expect(inlineSourceMap(code)).toEqual(map);
  });

  it("ignores modules without one", () => {
    expect(inlineSourceMap("export const a = 1;")).toBeNull();
  });
});

describe("mapToSource", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the module once and maps positions from its map", async () => {
    const code = `x\n//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(map))}`;
    const fetcher = vi.fn(async () => ({ ok: true, text: async () => code }));
    vi.stubGlobal("fetch", fetcher);
    const url = "http://localhost:5287/src/ColorLab.tsx?t=1";
    expect(await mapToSource(url, 3, 5)).toEqual({ source: "ColorLab.tsx", line: 49, column: 7 });
    expect(await mapToSource(url, 1, 30)).toEqual({ source: "ColorLab.tsx", line: 3, column: 3 });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
