import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { surfacentSource } from "surfacent-tool/dev";
import { surfacent } from "surfacent-tool/vite";
import { defineConfig } from "vite";

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Three pages: /demo (the default: `/` redirects there), an app UI with the
// toolbar running on it; /suggest, a small screen before its migration, for
// trying suggestion mode; and /playground, every part of the toolbar's UI in
// every state.
// surfacent-ui is a linked workspace package, so Vite only finds the ui-sdk
// parts it imports once its files load, and a late re-bundle can load a
// second copy of React. Listing them bundles everything in one pass.
const UI_SDK_PARTS = [
  "accordion",
  "agent",
  "button",
  "collapsible",
  "color-picker",
  "combobox",
  "field",
  "file-input",
  "input",
  "number-input",
  "popover",
  "primitive",
  "scroll-area",
  "segmented-control",
  "select",
  "slider",
  "switch",
  "tabs",
  "toggle",
  "toolbar",
  "tooltip",
];

export default defineConfig({
  // The toolbar from source (hot-reloaded), and the routes apps get from surfacent().
  plugins: [surfacentSource(), surfacent({ css: "src/index.css" }), react(), tailwindcss()],
  server: { port: 5287, strictPort: true },
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "lucide-react",
      "sugar-high",
      "@ui-sdk/core/color",
      ...UI_SDK_PARTS.map((part) => `@ui-sdk/react/${part}`),
    ],
  },
  build: {
    rolldownOptions: {
      input: {
        index: page("./index.html"),
        demo: page("./demo/index.html"),
        suggest: page("./suggest/index.html"),
        playground: page("./playground/index.html"),
      },
    },
  },
});
