// The toolbar from source, for this repo's demo: its stylesheets compiled on
// the fly (./styles.ts) and hot-reloaded. Apps get the toolbar compiled, and
// only need `surfacent()` from ./vite.ts.

import path from "node:path";
import type { EnvironmentModuleNode, Plugin } from "vite";
import { compileScss, compileUiCss, srcDir, UI_MODULE, version } from "./styles.ts";

// Compiled styles get their own module id, outside Vite's CSS pipeline.
const STYLE_SUFFIX = ".surfacent-style.ts";
const UI_MODULE_ID = `\0${UI_MODULE}`;

export function surfacentSource(): Plugin[] {
  // Every .scss file (partials included) → the style modules compiled from it.
  const dependents = new Map<string, Set<string>>();
  // Every file the UI stylesheet was built from (sources it scanned, CSS it imported).
  let uiFiles = new Set<string>();
  let production = false;

  return [
    {
      name: "surfacent:ui-css",
      enforce: "pre",
      configResolved(config) {
        production = config.command === "build";
      },
      resolveId(source) {
        return source === UI_MODULE ? UI_MODULE_ID : null;
      },
      async load(id) {
        if (id !== UI_MODULE_ID) return null;
        const { code, files } = await compileUiCss(production);
        uiFiles = files;
        for (const file of files) this.addWatchFile(file);
        return code;
      },
      // A source that may hold new classes rebuilds the stylesheet with it.
      hotUpdate({ file, modules }) {
        if (!uiFiles.has(file) && !(file.startsWith(srcDir) && /\.(tsx?|css)$/.test(file))) return;
        const graph = this.environment.moduleGraph;
        const module = graph.getModuleById(UI_MODULE_ID);
        if (!module) return;
        graph.invalidateModule(module);
        return [...modules, module];
      },
    },
    {
      name: "surfacent:styles",
      enforce: "pre",
      config() {
        return { define: { __VERSION__: JSON.stringify(version) } };
      },
      resolveId(source, importer) {
        if (!importer || !source.endsWith(".scss")) return null;
        const from = importer.endsWith(STYLE_SUFFIX) ? importer.slice(0, -STYLE_SUFFIX.length) : importer;
        if (!from.startsWith(srcDir)) return null;
        return path.resolve(path.dirname(from), source) + STYLE_SUFFIX;
      },
      async load(id) {
        if (!id.endsWith(STYLE_SUFFIX)) return null;
        const file = id.slice(0, -STYLE_SUFFIX.length);
        const { code, files } = await compileScss(file);
        this.addWatchFile(file);
        for (const source of files) {
          this.addWatchFile(source);
          const ids = dependents.get(source) ?? new Set<string>();
          ids.add(id);
          dependents.set(source, ids);
        }
        return code;
      },
      // The compiled modules have their own ids, so an edited .scss must
      // invalidate them explicitly; their importers then hot-update.
      hotUpdate({ file }) {
        const ids = dependents.get(file);
        if (!ids) return;
        const graph = this.environment.moduleGraph;
        const modules = [...ids]
          .map((id) => graph.getModuleById(id))
          .filter((module): module is EnvironmentModuleNode => module != null);
        for (const module of modules) graph.invalidateModule(module);
        return modules;
      },
    },
  ];
}
