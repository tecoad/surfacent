// The toolbar's stylesheets, compiled to strings it injects into its shadow
// root instead of the page's CSS pipeline. Shared by the demo's dev plugin
// (./dev.ts) and the published build (packages/surfacent/tsup.config.ts):
//
// - Each .scss file becomes a module exporting `css`, plus its CSS-module
//   class names (a `.module.scss`) as the default export.
// - `virtual:surfacent-ui-css` is the Tailwind UI (src/design/ui.css: surfacent-ui
//   and this package's classes), whether or not the app uses Tailwind.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile, optimize } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import postcss from "postcss";
import postcssModules from "postcss-modules";
import * as sass from "sass";

const here = path.dirname(fileURLToPath(import.meta.url));
export const srcDir = path.join(here, "src");
export const UI_MODULE = "virtual:surfacent-ui-css";
const UI_CSS = path.join(srcDir, "design", "ui.css");
// `@property` rules don't work inside a shadow root; they go to the document.
const PROPERTY_RULE = /@property\s+[\w-]+\s*\{[^}]*\}\s*/g;

/** The version the toolbar shows, from this package. */
export const version = (JSON.parse(fs.readFileSync(path.join(here, "package.json"), "utf8")) as { version: string }).version;

/**
 * Tailwind's compiler, as @tailwindcss/vite runs it: src/design/ui.css, its `@source`
 * globs scanned for classes. Returns the module for the shadow root's CSS and
 * the document's `@property` rules, and the files it depends on.
 */
export async function compileUiCss(minify: boolean): Promise<{ code: string; files: Set<string> }> {
  const files = new Set<string>([UI_CSS]);
  const compiler = await compile(fs.readFileSync(UI_CSS, "utf8"), {
    base: path.dirname(UI_CSS),
    onDependency: (file) => files.add(file),
  });
  const root = compiler.root === "none" || compiler.root === null ? [] : [{ ...compiler.root, negated: false }];
  const scanner = new Scanner({ sources: [...root, ...compiler.sources] });
  const built = optimize(compiler.build(scanner.scan()), { minify }).code;
  for (const file of scanner.files) files.add(file);
  const properties = built.match(PROPERTY_RULE)?.join("") ?? "";
  const css = built.replace(PROPERTY_RULE, "");
  return { code: `export const css = ${JSON.stringify(css)};\nexport const properties = ${JSON.stringify(properties)};\n`, files };
}

/** A .scss file as a module: `css`, and the class names of a CSS module. Also returns every file it loaded. */
export async function compileScss(file: string): Promise<{ code: string; files: string[] }> {
  const compiled = sass.compile(file);
  const files = compiled.loadedUrls.filter((url) => url.protocol === "file:").map((url) => fileURLToPath(url));
  if (!file.includes(".module.")) {
    return { code: `export const css = ${JSON.stringify(compiled.css)};\nexport default {};`, files };
  }
  let classNames: Record<string, string> = {};
  const result = await postcss([
    postcssModules({
      getJSON: (_file: string, json: Record<string, string>) => {
        classNames = json;
      },
      generateScopedName: "[name]__[local]___[hash:base64:5]",
    }),
  ]).process(compiled.css, { from: file });
  return { code: `export const css = ${JSON.stringify(result.css)};\nexport default ${JSON.stringify(classNames)};`, files };
}
