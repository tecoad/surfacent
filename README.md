# Surfacent

Say what an element is, not what it looks like. Instead of picking colors, radii and sizes for each element, you mark it with an intent, like `data-surface="raised"`, `data-corner="1"` or `data-text="label muted"`. A Tailwind CSS plugin then derives the CSS from a few global settings, relative to where the element sits. A raised card inside a raised card is one step lighter again, and a button inside a card follows the card's corner.

Picking intents happens on the page itself. A toolbar lets you click an element, choose its intents and see them live. The notes then go to your coding agent over MCP, and the agent writes the attributes into your source.

> **Built for Tailwind CSS v4.** Surfacent started as a Tailwind plugin, and Tailwind v4 is what it needs today. The attributes and the CSS they generate are plain CSS, but two aspects lean on how v4 works:
>
> - **Density** rescales the `--spacing` variable that every v4 spacing utility is computed from.
> - **Concentric corners** reads the padding and radius that the `p-*` and `rounded-*` classes publish.
>
> Plain CSS can't read another element's padding, and its sizes don't share one variable. Without Tailwind v4, those two would need conventions of their own. Other stacks may come later.

## How it works

The tool is built in layers called **aspects**. Each one owns one attribute, its values, its settings and the CSS it generates:

| Attribute | Says |
| --- | --- |
| `data-surface` | How an element sits on what's below it: `raised`, `flat`, `sunken`, `ground`. |
| `data-color` | What it's made of: the `accent`, a hue for meaning (`red`, `green`…), solid or as a `tint`. |
| `data-response` | What it answers to: `hover`, `focus`, `click`. Attention brings it closer, a press pushes it in. |
| `data-corner` | Its radius, on a scale. By default every shape follows the curve of the one it sits in. |
| `data-density` | How much room a region takes, relative to its context: `tight`, `loose`… |
| `data-text` | What a piece of text is: `title`, `label`, `caption`…, with an optional ink (`muted`, `faint`). |

Every intent is relative to its context: an element reads its nearest ancestor in the same aspect, and nothing renders a fixed color or size.

## Requirements

- **Tailwind CSS v4**, configured in CSS (`@import "tailwindcss"`).
- **React 19**, for the toolbar.
- **Vite**, for the toolbar's Save and for finding the MCP server by itself. It's optional (see [Without Vite](#without-vite)).
- **Node 20** or later, for the MCP server.

## Install

```bash
npm install -D surfacent
```

With bun: `bun add -d surfacent`.

It's a development dependency. The plugin runs when Tailwind builds your CSS, and the toolbar and the MCP server only run in development.

## Setup

### 1. The Tailwind plugin

Add it after Tailwind, in the CSS file that imports Tailwind:

```css
@import "tailwindcss";
@plugin "surfacent/tailwind";
```

Settings go in the block, and the toolbar's Save writes them there:

```css
@plugin "surfacent/tailwind" {
  tone-ground: 0.97;
  tone-step: 0.03;
  corner-radius: 12;
}
```

Every setting is listed with its aspect [below](#aspects). Settings also become CSS variables on `:root`, which is how the toolbar previews a change before you save it.

### 2. The Vite plugin

```ts
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { surfacent } from "surfacent/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [surfacent({ css: "src/index.css" }), react(), tailwindcss()],
});
```

It does three things, in development only:
- It lets the toolbar read and save the settings in the `@plugin` block.
- It tells the toolbar where the MCP server is and how to start it.
- It adds surfacent's MCP server to `.mcp.json` at the project root, so Claude Code offers it in this project (step 4). An existing `surfacent` entry and other servers are left as they are.

| Option | Default | |
| --- | --- | --- |
| `css` | `"src/index.css"` | The CSS file with the `@plugin "surfacent/tailwind"` block, relative to the Vite root. |
| `mcpPort` | `SURFACENT_PORT`, else `4848` | The MCP server's port, if you run it on another one. |
| `mcpConfig` | `true` | Add the MCP server to the project's `.mcp.json`. |

### 3. The toolbar

Render it next to your app, in development only:

```tsx
import { Surfacent } from "surfacent";

export function Root() {
  return (
    <>
      <App />
      {import.meta.env.DEV && <Surfacent />}
    </>
  );
}
```

Open it with the button at the bottom right, or ⌘⇧F. Useful props:

| Prop | |
| --- | --- |
| `appName` | Your app's name, included in copied prompts. |
| `endpoint` | The MCP server's URL. Only needed without the Vite plugin. |
| `onCopy` | Called with the prompt whenever you copy one. |

The exact JSX line of a picked element comes from React's development build, so the agent edits the right element.

### 4. Your coding agent (MCP)

The toolbar hands notes to your agent through surfacent's MCP server. With the Vite plugin, the project's `.mcp.json` already has it: Claude Code asks once to approve it. Commit that file so everyone on the project gets it. To connect Claude Code once for every project instead:

```bash
claude mcp add surfacent -s user -- npx -y surfacent mcp
```

Other agents (Cursor, Windsurf, and others) take the same command in their MCP config:

```json
{
  "mcpServers": {
    "surfacent": { "command": "npx", "args": ["-y", "surfacent", "mcp"] }
  }
}
```

The agent starts the server, and the toolbar connects to it by itself. In a project that has surfacent installed, `npx` runs that version, so the server and the toolbar always match.

Then ask your agent to **listen**, for example: "listen for surfacent notes". It calls `surfacent_listen` and picks up every note you send while it listens.

To run only the toolbar's side of the server, without an agent: `npx surfacent mcp --http-only`.

## Using the toolbar

### Picking intents

Open the toolbar and click an element. A popup opens beside it (never over it), with one row per aspect:
- **Hovering** a value previews it on the page at once.
- **Clicking** picks it. On a scale, like Corners, dragging the slider picks.
- **Clicking anywhere else** (or Apply) records the note.

The preview stays on the page, across reloads, until the agent writes the attribute into your source, so you never wait for the agent to see the result. Esc or Cancel undoes it.

While the toolbar is open, clicks select instead of interacting. So the picker simulates states: hovering Hover, Focus or Click in the Response row shows the element in that state. Other keys:
- ↑/↓ in the popup header (⌥↑/⌥↓ from the note field) walk to the parent or back, since surfaces are usually containers.
- ⌘-click (Ctrl-click) picks the element under an overlay.

A note can also carry your own words, for anything the attributes don't say.

The toolbar flags what the CSS can't see with a red (!) beside the aspect's label, and the prompt tells the agent what to fix. Examples: a rounded parent that isn't a shape, or padding set outside Tailwind classes.

### Sending to your agent

The MCP side has one state, with the same name and color everywhere: the dot on the closed launcher, the dot on Settings, and its badge.

| State | Meaning |
| --- | --- |
| **Not connected** (red) | No MCP server. Copy your notes, or connect an agent (setup step 4). |
| **Not listening** (yellow) | A server, but no agent listening. Ask your agent to listen. |
| **Listening** (purple) | An agent is in listening mode: your notes go to it. |

Notes stay in the toolbar until an agent listens:
- **Auto send** (on by default, in Settings): each note goes to the listening agent as you make it, along with any made before.
- **Auto send off:** a Send button leads the dock, and sends them all at once.
- **Copy (C) and Clear (X):** they appear while there are notes no agent has. Copying gives you a prompt to paste into any agent.

A note an agent took turns its marker purple with a bot, and its card says an agent is on it. When the agent resolves it, the marker leaves. If you change a note after that, it goes back to the agent. Deleting a note the agent already applied keeps what your code renders.

### Suggestion mode

Press **S** (it needs a listening agent). The toolbar scans the page for two kinds of elements: ones that still carry classes an aspect replaces, and interactive ones without a response. It sends them to the agent with the full guide: the philosophy, why each aspect exists, and when each value fits.

The agent answers with intents. They come back as dashed markers, previewed on the page, and your code doesn't change. In the review bar above the dock:
- ← → walk through the suggestions: each step scrolls to the element and opens its card;
- Before shows the page without them;
- you accept or reject each one, or all at once.

Accepted suggestions become ordinary notes, sent like any other.

### Design settings

The dock's Surface, Corners and Rhythm panels hold every setting, as sliders and switches. Changes apply to the page live, and Save writes them into your `@plugin` block. A changed setting's label stays blue until saved.

### Migrating an app

Settings → **Copy migration prompt** gives your coding agent everything it needs to move an app to surfacent:
- install, the `@plugin` block (with the settings you tuned), and what changes as soon as it's installed;
- every attribute, how the app's classes map to them, and the order to convert in;
- searches for what's left, and a section for the app's AGENTS.md or CLAUDE.md.

The suggestions you accepted are listed as already decided. [MIGRATION.md](MIGRATION.md) is the same prompt, with the default settings.

## Aspects

### Surface

`data-surface` says how an element sits on the surface below it:

- `raised`: one step lighter than what it sits on, casts a shadow.
- `flat`: the tone of what it sits on, separated by a hairline.
- `sunken`: one step darker than what it sits on, inner shadow.
- `ground`: back to the page tone, wherever it is nested.

Everything is relative to the nearest surface ancestor, never a fixed color: `flat` inside a `raised` card is the card's tone, and a `raised` popover inside it is one more step. How a surface reacts to the pointer is a separate aspect, `data-response` (below).

Light comes from above. Besides the tone, each surface carries its elevation above the ground (`--surface-z`: +1 per raised level, −1 per sunken, reset by `ground`). The higher a surface, the closer to the viewer: more light catches its top edge (scaled by `light-highlight`) and its cast shadow drops further and spreads (per level: 3px down, 8px blur, 1px tucked in, up to 6 levels), while a crisp contact shadow stays at the edge. The fill is never touched, and the light is drawn on the outer edge line, so children that paint their own background (a sticky header) never cover it. A card at z=1 gets a faint top edge and a short shadow, a menu on it (z=2) twice both, and a control that gets attention rises 0.6 of a level, so its light and shadow grow with it. Sunken surfaces get no highlight or cast shadow, only an inner shadow and a lit lower lip. Text, edges and shadows derive from the resolved tone (`text-ink`, `text-ink-muted`, `text-ink-faint`, `border-edge`, `divide-edge`, `bg-surface` are Tailwind colors that follow the nearest surface).

Settings (`@plugin` options, also CSS variables on `:root`):

| Key | Meaning |
| --- | --- |
| `tone-ground` | Page tone, 0 black to 1 white. `tone-ground-dark` is its dark theme value (a `dark` class or `data-theme="dark"` on `<html>`). A dark theme changes only this. |
| `tone-step` | One level of elevation. |
| `tint-chroma` | Chroma of neutral fills and inks, tapered to 0 near black and white to stay in sRGB. |
| `tint-hue` | Hue of the neutral tint. |
| `light-highlight` | Top-edge highlight per level of elevation, 0 (off) to 1. |

Math borrowed from Ariakit Tailwind: OKLCH relative tones, the 0.645 lightness threshold between dark and light ink, and a lift for raising near-black parents (below 0.13 L steps are hard to see). Ariakit reads the parent layer through even/odd contexts and style container queries; here `nestingChain()` uses exact-depth slots (`--surface-l-1…12`), which need neither.

### Color

`data-color` says what an element is made of:

- `accent`: the brand color.
- `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `purple`, `pink`: hue colors, for meaning (danger, warnings, success, information) instead of a palette.
- `neutral`: back to the neutral material, inside a color.

The hue colors are computed from the accent: its chroma, tone and step scale at fixed hues (red 25°, orange 50°, yellow 90°, green 150°, teal 190°, blue 255°, purple 300°, pink 350°), so every color has the same weight and moves with elevation the same way. They have no settings of their own. In the picker, values that are colors show as swatches.

Each color comes solid (the pigment, the default) or as a **tint**, a modifier after the value: `data-color="red tint"`. A tint is the color as a dye: the neutral tone in its spot leaning toward the solid color there by `accent-tint`, with that share of the color's chroma, and text in the color, kept legible. It follows elevation like a neutral surface, and mixing after the neutral's white ceiling keeps it tinted on white cards. At 0 it's the neutral, at 1 the solid. Status badges, callouts and soft buttons are tints; a solid button inside a tint callout starts its own color in the light there.

A material has a tone on the page plane and a share of the light: each level up moves it that share of a step lighter, each level down darker, relative to what it sits on. Where the material changes, it starts from its own page-plane tone, moved by its share of how far the neutral tone there is from the ground (`--surface-n`, the neutral tone in every spot, rides the nesting chain with the material number). The neutral is the page itself: `tone-ground`, a full step per level. The accent is `accent-tone` on the page plane, so a flat accent on the page, or an accent `ground` (a brand section), is exactly the brand color, and it follows the light by `accent-light`. At 0.5, a badge on a raised card is half a step lighter than on the page, a raised primary button half a step lighter than a badge beside it, a `sunken` count inside the button half a step darker, and hover and press move it the same way. A lower share keeps high elevations from washing the brand out to white. Ink follows the 0.645 threshold as everywhere, decided by the tone at rest so it never flips mid-press. Chroma is exact at the shared tone and tapers toward 0 at black and white, so lighter and darker tones stay in sRGB.

On an element without `data-surface` (links, icons, ghost buttons), `data-color` only colors the ink: the color lying on the surface below, moved to the nearest tone that keeps 4.5:1 there, so it darkens on light surfaces and turns white on a surface of its own color. `data-color="neutral"` on a surface returns to the neutral material, at the tone elevation gives it there: a knob on an accent track keeps its usual tone.

```html
<button data-surface="raised" data-color="accent" data-response="hover click">Deploy</button>
<button role="switch" data-surface="sunken" data-color="accent">
  <span data-surface="raised" data-color="neutral"></span>
</button>
<a data-color="accent">View invoices</a>
<p data-color="green">✓ Ready</p>
<span data-surface="flat" data-color="red tint">Failed</span>
```

The accent is also a Tailwind color, `accent`, lit like the surface it's used on, for what isn't a surface: focus rings (`ring-accent/60`), native controls (`accent-accent`), chart marks.

| Key | Meaning |
| --- | --- |
| `accent-hue` | Hue of the brand color. Hue colors keep their own hues. |
| `accent-chroma` | Chroma of the accent and the hue colors, at the shared tone. |
| `accent-tone` | Lightness of the accent and the hue colors on the page plane. `accent-tone-dark` is its dark theme value. |
| `accent-light` | Step scale: how much a level changes the tone of colored materials, as a multiple of `tone-step`, 0 to 2. 1 as much as a neutral surface, 0 their page-plane tone everywhere. `accent-light-dark` is its dark theme value. |
| `accent-tint` | Tint strength: the share of the color a tint takes, 0 (the neutral) to 1 (the solid). `accent-tint-dark` is its dark theme value. |

### Response

One physical law for every element: attention brings it closer, a press pushes it in. `data-response` only lists what the element answers to, in any mix, never the direction, so nothing can rise on a click:

- `hover`: rises while the pointer is over it.
- `focus`: rises while it's in use: a field being typed in, or keyboard focus.
- `click`: sinks below its rest while pressed.

```html
<button data-surface="raised" data-response="hover click">Deploy</button>
<input data-surface="sunken" data-response="focus">
<article data-surface="raised" data-response="hover">Card that ignores clicks</article>
```

Without `data-response` an element never moves. When contacts overlap, the stronger wins (press > focus > hover), so a press always sinks and a field in use doesn't jump when the pointer passes. Hover only applies on devices that can hover. The response only moves the element's level (`--surface-dz-state`); tone, light and shadow follow. An element with `data-response` and no `data-surface` is part of the plane at rest and only shows while it moves: risen as a raised surface, pressed as a dent (ghost buttons, list rows). A level change takes `response-motion`; a press lands in about half.

Aspects whose values combine declare `multiple: true`: CSS matches each value with `~=`, and the toolbar shows them as toggles instead of a single choice.

| Key | Meaning |
| --- | --- |
| `response-rise` | Levels an element comes closer when it gets attention. |
| `response-press` | Levels an element sinks below its rest when pressed. |
| `response-motion` | Duration of a level change. |

### Corners

Corners are concentric by default. While the **Concentric corners** setting is on, every shape (an element with `data-surface`, `data-response` or `data-corner`) follows the curve of the shape it sits in: that shape's radius minus the padding between them. `data-corner` gives an element a radius of its own instead, and the shapes inside follow it: the tree starts over there.

`data-corner` is that radius, a scale the toolbar shows as a slider:

- `concentric` (the default, without the attribute): follows the curve of the shape it sits in.
- `0`: square.
- `0.25`, `0.5`, `0.75`, `1`, `1.25`, `1.5`, `2`: that many times the base radius.
- `pill`: fully round ends; concentric shapes inside stay pills.

While Concentric corners is on, `rounded-*` classes on shapes have no effect: the plugin paints shapes' corners `!important`, so they win over those classes (a later layer), and a preview shows before the agent removes them. Off, shapes keep their `rounded-*` classes as a radius of their own: the plugin reads them, so explicitly concentric shapes inside follow them.

```html
<div data-surface="raised" data-corner="1" class="p-1">  <!-- 12px, its own -->
  <button data-surface="flat">Item</button>              <!-- 12 − 4 = 8px -->
</div>
```

A concentric radius is `max(R − d, R × corner-min)`, where `R` is the parent's radius and `d` its padding (the largest side). Near the edge that's the parent's curve, so the gap between the two edges stays even around the corner; far from it, Minimum × the parent's radius. It takes the larger of the two, so it never jumps. A shape with no shape around it sits on the page, a shape of the base radius with no padding, so it takes the base radius. With Concentric corners off, shapes without a radius of their own have none and pass the curve through, adding their padding: only `data-corner` and `rounded-*` set radii, and `data-corner="concentric"` still follows the nearest one.

The padding comes from Tailwind classes. CSS can't read another element's padding or radius, so the plugin hooks Tailwind's padding utilities (`p-*`, `px-*`, `py-*`, `ps-*`, `pe-*`, `pbs-*`, `pbe-*`, `pt-*`, `pr-*`, `pb-*`, `pl-*`) and radius utilities (`rounded-*` and its sides and corners): `p-1` keeps its padding and also publishes it as `--corner-pad-*`, `rounded-xl` publishes `--corner-own-*`, variants and arbitrary values included. Padding set any other way (inline styles, custom CSS) is invisible. Elements that aren't shapes don't take part: a wrapper that adds padding between two shapes hides that space, and an element painted by classes (a menu item with `hover:bg-*`) keeps its own radius; give them `data-corner="concentric"` (a wrapper has no paint, so its radius never shows). A child flush with a shape's edge, like a sticky header, reads the shape's radius from `--corner-r`: `rounded-t-(--corner-r)`. Borders aren't counted yet.

The toolbar checks what the CSS can't see. When a concentric element sits in a rounded element that isn't a shape, behind a padded wrapper, or in a shape whose padding isn't in classes, the picker flags it with a red (!) beside the Corners label (its tooltip says what to check) and the prompt tells the agent what to change.

Ariakit Tailwind's `ak-frame` computes the same radius, with radius and padding declared together (`ak-frame-xl/4`), and blends to a declared radius far from the edge. Here only the elements that start a shape over declare a radius; everything else derives from the base radius, the padding classes and the minimum.

| Key | Meaning |
| --- | --- |
| `corner-concentric` | Concentric corners, 1 (on, the default) or 0: every shape without `data-corner` follows the shape it sits in, whatever its `rounded-*` classes say. |
| `corner-radius` | Base radius: the radius of top-level shapes, and the unit of `data-corner` (`1` is this). |
| `corner-min` | The least a nested shape keeps of its parent's radius when it sits too far from the edge to follow its curve. 1 keeps the parent's radius, 0 lets it go square. |

### Density

`data-density` says how much room a region takes, relative to its context: its padding, gaps, control sizes and text. It's a context, not a size: set it on a toolbar, a sidebar, a card or a form, and everything inside follows. A button doesn't choose its size: the same button is smaller in a tight toolbar and larger in a loose hero.

- `tighter`, `tight`: one or two steps denser than the context. Toolbars, sidebars, menus, dense tables.
- `same` (the default, without the attribute): as dense as the context.
- `loose`, `looser`: one or two steps roomier. Forms, settings, heroes, empty states.

Components don't take a size prop: each has one size, and density scales it. A group of small buttons sits in a `tight` region, and a single control that should recede or stand out takes `data-density="tight"` or `"loose"` itself. With the default step (0.25) a 36px button is 28.8px tight and 45px loose.

Steps are relative: `tight` inside a `tight` sidebar is tighter. Each step multiplies the context's density by `1 + density-step` or divides it, between 0.5 and 2. The page itself has `density-base`.

```html
<aside data-density="tight">   <!-- its p-3, gap-2, h-9 buttons and text-sm all shrink one step -->
  …
</aside>
```

It owns no classes. Tailwind v4 resolves each spacing utility where it's used, as `calc(var(--spacing) * n)`, and each text size as `var(--text-*)`, so a region only redefines `--spacing` and the `--text-*` sizes, from Tailwind's own values read on `:root`. Padding, margins, gaps, heights, widths, insets and icons on the spacing scale follow, and so does text by `density-text`. The padding the corners read follows too, so concentric radii stay right. Arbitrary values (`p-[13px]`, `text-[11px]`) and widths from other scales (`max-w-sm`) stay as written; the toolbar lists the fixed sizes inside a region it edits. Widths on the spacing scale (`w-60`) scale with it.

| Key | Meaning |
| --- | --- |
| `density-base` | Density of the whole page: 1 is Tailwind's scale as written, lower is denser, higher is roomier. |
| `density-step` | How much one step changes spacing and sizes. |
| `density-text` | How much text follows density: 0 keeps text sizes, 1 scales them as much as spacing. |

### Text

`data-text` says what a piece of text is, not how big it is. Each role is a whole style, so a size never gets paired with a line height by hand:

| Role | What it is | Default |
| --- | --- | --- |
| `display` | The page title, or a hero line. | 36/40, 600, tight |
| `figure` | A number that is the point: a total, a stat, a price. | 24/32, 600, tight |
| `title` | The title of a section or a dialog. | 20/28, 600, tight |
| `heading` | The title of a card, a group or a list item. | 15/22.5, 600, tight |
| `body` | Prose: descriptions and paragraphs. | 14/24 |
| `label` | Interface text: controls, fields, menus, table cells. | 14/20 |
| `caption` | Secondary text: hints, metadata, timestamps, badges. | 12/16 |

Sizes come from one scale: `type-base` (the body size) times `type-ratio` once per step, rounded to whole pixels. With 14px and 1.2 the roles land on the sizes above. Line height is a ratio of the size and titles track tight (−0.025em), so both follow when the scale or density changes. Roles follow density by its Text setting: a label in a tight toolbar is smaller, and the caption next to it shrinks in proportion.

How much the text stands out is part of it too: no modifier is full ink, `muted` is secondary text (it replaces `text-ink-muted`) and `faint` tertiary (`text-ink-faint`), as in `data-text="label muted"`. Both take the ink of whatever the text sits on, softened, so on a colored badge they soften its color. They don't combine (with both, the CSS would apply only `faint`), so the aspect declares them as one `modifierGroups` entry and the picker shows them under the roles as Ink: Muted and Faint chips, one on at most.

A role is inherited: set it on a container and everything inside has it until another `data-text`. A typical app sets `label` on its root, `heading` on section titles, `body` on their descriptions, `figure` on stats and `display` on the page title. The role owns size, line height, letter spacing, the weight of titles and the ink level; brand colors, hover colors, `font-mono`, `font-medium`, `uppercase` and `tabular-nums` stay as classes. The toolbar lists the text sizes set by hand inside an element it edits, which win over its role.

Tailwind's own text scale (`text-xs` … `text-9xl`) stays available, so an interface can move to roles gradually. Once an app no longer uses it, it can turn it off with `@theme { --text-*: initial; }`; arbitrary sizes (`text-[11px]`) don't need it.

| Key | Meaning |
| --- | --- |
| `type-base` | Size of body and label text; every other role is steps of the ratio from it. |
| `type-ratio` | How much bigger each step of the scale is. |


## Agents (MCP)

One process does two jobs. `npx surfacent mcp` serves the toolbar over HTTP on `127.0.0.1:4848`, and the agent's tools on stdio. An agent that starts while another surfacent server holds the port uses that one, so two agents see the same notes.

| Command | |
| --- | --- |
| `surfacent mcp` | Both sides: what an agent's MCP config runs. |
| `surfacent mcp --http-only` | Only the toolbar's side, e.g. from a terminal. |
| `surfacent mcp --mcp-only` | Only the tools, on a server already running. |
| `--port <n>` | Another port (default 4848, or `SURFACENT_PORT`). |
| `--store <file>` | Where notes are kept (default `~/.surfacent/annotations.json`). |

| Tool | What it does |
| --- | --- |
| `surfacent_guide` | The philosophy, what each aspect and value means (why it exists, when it fits), and how to apply a note. |
| `surfacent_listen` | Listening mode. It waits for work and returns it: the notes sent to it, which it marks as being worked on (the purple marker), and suggestion requests, with the guide to answer them. Notes made in a row come together. While it waits, and for 15 s after (the gap before the next call), the toolbar shows Listening. |
| `surfacent_resolve`, `surfacent_dismiss` | A note applied, with a summary (the toolbar drops its preview and the marker leaves), or declined, with a reason. A note that only asks a question is answered in the agent's reply, then resolved. |
| `surfacent_suggest` | Answers a suggestion request: intents for the candidates that need them, each with a reason, checked against the aspects. |

**The listening loop:**
1. Call `surfacent_listen`.
2. Apply each note it returns, then resolve it.
3. Answer each suggestion request with `surfacent_suggest`, with no code changes.
4. Call `surfacent_listen` again.

Notes outlive the agent: the store file is written atomically and flushed when the process exits. A store that can't be read is moved aside, never overwritten.

**Security:** the server only answers this machine.
- Requests from another address, or with a Host header that isn't local (what a DNS-rebinding page sends), get a 403.
- Browsers only get CORS headers on dev origins: localhost, `*.localhost`, private network addresses, `.local`, `.test` and `.internal`.

What the toolbar sends becomes instructions for an agent, so other sites can't add to it.

## Without Vite

The toolbar works in any React 19 app. In Next.js, for example, it's a client component: render it when `process.env.NODE_ENV === "development"`.

Without the Vite plugin, two things change:
- **The MCP server:** pass its URL, as in `<Surfacent endpoint="http://127.0.0.1:4848" />`.
- **Save:** the design panels still preview live, but saving needs the plugin. Copy the values into your `@plugin` block yourself.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): running the demo and playground, the repository's layout, adding an aspect, and releases.

## License

MIT, except the toolbar (`packages/tool`, published as the package's `dist/index.js`), which is licensed under the PolyForm Shield License 1.0.0. See [LICENSE](LICENSE) and [packages/tool/LICENSE](packages/tool/LICENSE).
