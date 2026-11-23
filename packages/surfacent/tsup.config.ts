// The published package, built from the workspaces' sources: the toolbar for
// the browser (its stylesheets compiled in, React left to the app), and the
// Tailwind plugin, the Vite plugin and the CLI for Node. Only the MCP SDK and
// zod stay dependencies; everything else is bundled.

import fs from "node:fs";
import type { Plugin } from "esbuild";
import { defineConfig } from "tsup";
import { compileScss, compileUiCss, UI_MODULE } from "../tool/styles.ts";

const { version } = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/** The toolbar's .scss modules and its Tailwind UI stylesheet, as the demo's dev plugin compiles them. */
const toolbarStyles = (): Plugin => ({
  name: "surfacent-styles",
  setup(build) {
    build.onResolve({ filter: /^virtual:surfacent-ui-css$/ }, () => ({ path: UI_MODULE, namespace: "surfacent-ui-css" }));
    build.onLoad({ filter: /.*/, namespace: "surfacent-ui-css" }, async () => ({ contents: (await compileUiCss(true)).code, loader: "js" }));
    build.onLoad({ filter: /\.scss$/ }, async (args) => ({ contents: (await compileScss(args.path)).code, loader: "js" }));
  },
});


export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    platform: "browser",
    target: "es2022",
    dts: true,
    clean: false,
    external: ["react", "react-dom", "react/jsx-runtime"],
    noExternal: [/^(?!react($|\/)|react-dom($|\/)).*/],
    esbuildPlugins: [toolbarStyles()],
    define: { __VERSION__: JSON.stringify(version) },
    banner: { js: '"use client";' },
  },
  {
    entry: {
      tailwind: "../core/src/tailwind.ts",
      vite: "../tool/vite.ts",
      cli: "../mcp/src/cli.ts",
    },
    format: ["esm"],
    platform: "node",
    target: "node20",
    // The Tailwind plugin is loaded by `@plugin` in CSS: only the Vite plugin needs types.
    dts: { entry: { vite: "../tool/vite.ts" } },
    clean: false,
    external: ["tailwindcss", "vite", "@modelcontextprotocol/sdk", "zod"],
    noExternal: [/^surfacent-/],
  },
]);
