# Contributing

## Run

```bash
npm install
npm run dev             # the demo on http://localhost:5287/demo/, a small page for suggestion mode on /suggest/, the UI playground on /playground/
npm run mcp             # surfacent's server on :4848 for the toolbar, without an agent
npm run css             # print the CSS every aspect generates
npm run typecheck       # strict tsc for every package and the demo
npm run check:snippets  # every playground code example compiles
npm run lint            # oxlint: correctness rules as errors, unused code included
npm run knip            # knip: unused files, exports and dependencies across the workspaces
npm run test            # node --test for core and the MCP server, vitest (jsdom) for the toolbar
npm run package         # build the published package into packages/surfacent/dist
npm run check:package   # pack it, install it in an empty project and use each entry
```

You can run the scripts with `bun run <script>` or `npm run <script>`. Note that `bun test` is bun's own test runner, not this suite.

While developing, connect Claude Code to this repo's server source, not the published package:

```bash
claude mcp add surfacent -s user -- node <this repo>/packages/mcp/src/cli.ts mcp
```

The toolbar's MCP page (Settings → MCP) shows that command with this machine's path.

## Layout

| Path | What |
| --- | --- |
| `packages/core` (`surfacent-core`) | The aspect registry, the Tailwind v4 plugin (`src/tailwind.ts`) and the prompt helpers. TypeScript that runs as-is: Node strips the types when Tailwind loads the plugin, and Vite compiles it for the browser. |
| `packages/core/src/aspects/` | One file per aspect (surface, color, response, corner, density, text): values, settings, CSS and agent rules. |
| `packages/core/src/chain.ts` | `nestingChain()`, which lets an element read the value of its nearest ancestor in the same aspect. |
| `packages/core/src/philosophy.ts` | The philosophy the agent guide and the migration prompt open with. |
| `packages/ui` (`surfacent-ui`) | The toolbar's UI: [ui-sdk](https://ui-sdk.dev/) parts in a compact dark look (the dock, panels, rows, sliders, swatches, chips, menus, scroll areas) and its stylesheet (`styles.css`, Tailwind v4). |
| `packages/tool` (`surfacent-tool`) | The toolbar, `<Surfacent />`: the aspect picker, previews, the design panels and aspect-aware prompts are in `src/design/`. Licensed under PolyForm Shield 1.0.0 (`LICENSE`). |
| `packages/tool/vite.ts` | The Vite plugin apps use. It serves `/__surfacent/settings`, which reads and writes the `@plugin` block, and `/__surfacent/mcp`: whether the MCP server runs, and the commands that start it. |
| `packages/tool/dev.ts`, `styles.ts` | The toolbar's stylesheets, compiled to strings for its shadow root: SCSS modules, and the Tailwind UI (`src/design/ui.css`) as `virtual:surfacent-ui-css`. The demo compiles them on the fly with `surfacentSource()`; the package build compiles them once. |
| `packages/mcp` (`surfacent-mcp`) | The MCP server: the toolbar's HTTP routes and the `surfacent_*` tools. |
| `packages/surfacent` | The published package. tsup bundles the workspaces into `dist/`: the toolbar for the browser (`index.js`), and the Tailwind plugin, the Vite plugin and the CLI for Node. |
| `apps/demo` | Three pages: `/demo` (where `/` goes), a full app UI with many levels of surfaces and a lab per aspect; `/suggest`, a small screen before its migration, for suggestion mode; `/playground` (`src/playground/`), every part of the toolbar's UI in every state, with its code. |

The workspace packages are private, and only `packages/surfacent` is published. The demo uses the sources: `surfacentSource()` compiles the toolbar, and its CSS points at `packages/core/src/tailwind.ts` by relative path, because Tailwind only hot-reloads plugins imported that way.

## The toolbar's UI

The toolbar renders in its own shadow root with its own stylesheet. `src/design/ui.css` is compiled with Tailwind, whether or not the app uses Tailwind, and the toolbar puts its `@property` rules in the page's head, since they don't work in a shadow root. The SCSS still used for markers, outlines and the note popup's frame (its placement, motion and the card's preview-to-edit morph) sits in a `legacy` layer, between Tailwind's preflight and its utilities.

To see the UI's parts, open `/playground`, pick one in the sidebar, then a state. Code shows each state as code that compiles.

## The demo's labs

The demo's **Color lab** (top of the page) has no controls: one row per way an element takes a color, each with its live height and paint. The whole palette solid, as a tint and as ink, then the accent on a button, a badge, a soft button and a callout as tints, a switch, a count inside a button, a field, a neutral card, a link and a ghost button. What a row sits on, its color and its state are changed with the toolbar, like anywhere else.

The demo's **States lab** (below the Color lab) is one column, one row per kind of element (raised button, ghost button, flat chip, list row, sunken input, raised card), each with its `data-response` set, its live height (z) and its paint (OKLCH of its fill, or of its ink when it has none). **State** above the card holds every row in hover, focus or click, the way the toolbar's picker simulates states; rows whose set doesn't include that state stay at rest. **Off** hands the rows back to the mouse. **Sits on** changes what the rows sit on (page, card, well or brand), and **Slow motion** stretches the transitions. Rise, Press and Motion only act while something is touched, so hold a state and move those sliders in the Design panel: the rows follow live.

In the demo, cards, lanes, the menu, the main panel, the workspace button and the usage card have `data-corner="1"`; the switch track and the progress bar are `pill`; everything inside them is concentric by default.

The demo's **Corners lab** nests four shapes like the elevation stack, each with the toolbar's slider, its live radius and the rule that set it: `own` (a radius of its own), `curve` (the parent's radius minus the padding), `minimum` (Minimum × the parent's radius, when the padding is too big for the curve) or `off` (passed through while Concentric corners is off). Give a middle level a radius of its own and the levels inside start over from it. Its Padding slider is only the page's: every level has a `p-(--lab-padding)` class, which the corners read like any padding class. The switch and the Radius and Minimum sliders are the design settings, the same variables the Design panel edits, so the whole page follows and the panel can save them.

The demo's **Density lab** has three parts. **Steps** shows the same strip of UI (a field, a segmented control, a switch, a badge, buttons) in five regions, one per step, with its density, the height of its Deploy button and its text size. **Text roles** shows every text role at every step, in pixels. **Components** puts a full sheet (heading and text, fields with labels and hints, a select, a textarea, every button variant in both sizes, switches, badges and a table) at a chosen step beside Same. Its sliders are the design settings, the same variables the Design panel edits.
## The migration prompt

The prompt is generated from the aspect registry, so it follows the code:
- `MIGRATION.md` is the copy with the default settings. Write it again after an aspect changes, with `node packages/core/scripts/print-migration.ts > MIGRATION.md`.
- The toolbar's **Copy migration prompt** copies it with the settings on the page.
- From code, `migrationPrompt({ settings, dark, elements })` returns it. `elements` are the elements already decided: the toolbar passes the suggestions you accepted, by page.

It opens with the philosophy (`PHILOSOPHY`). Every aspect says why it exists (`why`) and every value when it fits (`when`): the same text the agent gets from `surfacent_guide` and with each suggestion request (`suggestGuide()`).

Each aspect brings its part through `agent`:
- `global`: what installing changes, before any attribute;
- `migrate`: how classes map to its values;
- `find`: a pattern for the classes left to convert;
- `strict`: what to turn off once nothing uses it.

## Adding an aspect

1. Create `packages/core/src/aspects/<key>.ts` with `defineAspect({ key, label, description, why, values, settings, css, previewCss, colors, agent })`. Each value needs a `when`. Optional fields:
   - `multiple`: values combine.
   - `modifiers`: tokens after the one value, like `tint`.
   - `swatch`: on values that are colors.
   - `ordered`: the values form a scale, so the picker shows a slider.
   - `defaultValue`: what an element is without the attribute.
   - `modifierGroups`: modifiers that exclude one another, like the text's ink. The picker shows chips, one on at most.
   - `toggle`: on settings that are on or off. The panel shows a switch.
   - `colorFields`: settings that are one color's OKLCH channels. The panel shows them as one hex field.
   - `utilityHooks`: Tailwind classes that also publish their value, like `p-*` and `rounded-*` for corners.
   - `inspect`: what the toolbar should tell the agent about the element's context.
2. Add it to `aspects` in `packages/core/src/index.ts`.

Setting keys are global (they become `--<key>` and `@plugin` options), so prefix them by aspect. Use `nestingChain()` for anything relative to the parent, like concentric radii. The picker row, the settings group, the previews and the prompt rules all appear without UI changes.

The whole project is TypeScript. Code under `packages/core`, `packages/mcp` and `packages/tool/*.ts` runs in Node without a build step, so it follows three rules, which `tsc` enforces with `erasableSyntaxOnly` and `verbatimModuleSyntax`:
- only erasable syntax (no enums or namespaces);
- `import type` for types;
- explicit `.ts` extensions on relative imports.

## Releasing

Releases run by themselves. On every push to `main`, `.github/workflows/release.yml` runs semantic-release. It reads the commits since the last tag, as [Conventional Commits](https://www.conventionalcommits.org/):

| Commit | Release |
| --- | --- |
| `fix:` | patch |
| `feat:` | minor |
| `BREAKING CHANGE:` | major |

From there it:
1. builds `packages/surfacent` (its `prepack`);
2. publishes it to npm through trusted publishing (OIDC, with no token, and with provenance);
3. tags `vX.Y.Z` and writes the GitHub release.

CI (`.github/workflows/ci.yml`) runs every check and `npm run check:package` on each push and pull request.

### The first release (once)

npm only lets a package trust a workflow once the package exists. So:
1. Publish 0.1.0 by hand: run `npm login`, then `npm publish` in `packages/surfacent` (it builds first).
2. On npmjs.com, open surfacent → Settings → Trusted Publisher, and add GitHub Actions: repository `tecoad/surfacent`, workflow `release.yml`.
3. On GitHub, open the repository's Settings → Secrets and variables → Actions → Variables, and add `RELEASE_ENABLED` = `true`. Until then, the release workflow is skipped.

The `v0.1.0` tag is on the initial commit, so the next release counts from it.
