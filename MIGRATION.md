# Migrate this interface to surfacent

You're moving this app's UI to surfacent. Instead of choosing colors, radii and sizes for each element, every element says what it is with a data attribute (`data-surface="raised"`, `data-text="label muted"`…), and surfacent's Tailwind plugin derives the CSS from a few settings, relative to where the element sits. A raised card inside a raised card is one step lighter again; a button inside a card follows the card's corner. Work through this document in order.

## The idea

Surfacent styles an interface by intent, not by value. An element says what it is and how it behaves (a raised card, a sunken field, a heading, a tight toolbar) and the CSS derives its colors, radii, spacing and type from where it sits. Nothing renders a fixed color or size: a raised card inside a dialog is one step above the dialog, not the same gray as a card on the page.

- **Context over tokens.** Every intent is relative to the nearest ancestor in the same aspect. Judge an element by what it sits on and what it holds, never in isolation.
- **One physical world.** Light comes from above: what's raised catches more of it, what's sunken less. Attention brings an element closer; a press pushes it in.
- **Opinions are features.** How a surface relates to what's on it, ink to its surface, a press to a hover: these are decided once, by the aspects. An element only states its role.
- **Sameness is the default; depth is a choice.** Most elements need no intent: they inherit their context. Add one only where an element has a role of its own: a new material, a new level, a text role, a region with its own density.
- **Low effort, high adaptability.** Defaults cover the common case. An intent is how an element departs from it, not something every element carries.

## 1. Requirements

- Tailwind CSS v4, configured in CSS (`@import "tailwindcss"`). surfacent is a Tailwind plugin: it doesn't work with Tailwind v3 or without Tailwind. If the app isn't on Tailwind v4, stop and say so: that comes first.
- Browsers: Chrome and Edge 125+, Safari 16.4+, Firefox 128+. It relies on @property, oklch(), pow(), round() and :has().

## 2. Install

```bash
bun add -d surfacent
```

In the CSS file that imports Tailwind, add the plugin with these settings:

```css
@import "tailwindcss";

@plugin "surfacent/tailwind" {
  tone-ground: 0.97;
  tone-ground-dark: 0.17;
  tone-step: 0.03;
  tint-chroma: 0.008;
  tint-hue: 260;
  light-highlight: 0.6;
  accent-hue: 262;
  accent-chroma: 0.19;
  accent-tone: 0.58;
  accent-tone-dark: 0.6;
  accent-light: 0.5;
  accent-light-dark: 0.5;
  accent-tint: 0.15;
  accent-tint-dark: 0.15;
  response-rise: 0.6;
  response-press: 0.6;
  response-motion: 140;
  corner-concentric: 1;
  corner-radius: 12;
  corner-min: 0.66;
  density-base: 1;
  density-step: 0.25;
  density-text: 0.5;
  type-base: 14;
  type-ratio: 1.2;
}
```

Keep the values as they are: people tune them later, live, from the toolbar's Design panel. A dark theme is a `dark` class or `data-theme="dark"` on `<html>`, and changes only the `-dark` settings.

## 3. What changes as soon as it's installed

- **data-surface**: Paints <body> with the ground tone and its ink (background and text color) and sets color-scheme. A background or text color on <html> or <body> fights it: remove it.
- **data-corner**: With Concentric corners on (the default), every element with data-surface or data-response gets a concentric radius, which wins over its rounded-* classes.
- **data-density**: Redefines --spacing and Tailwind's --text-* sizes on <body> from density-base: at 1 nothing changes.

Everything else applies only where an attribute is set, so the app can move screen by screen. Check that it still looks right after installing, before converting anything.

## 4. The attributes

This UI is styled by intent: data attributes say how an element behaves, and the Tailwind plugin `surfacent/tailwind` derives the CSS from global settings in its `@plugin` block. Edit the JSX/HTML source, not the generated CSS.

**data-surface** — How the element behaves in a physical world. Light comes from above: raised catches more of it, sunken less.
Why it exists: Fixed backgrounds and shadows (bg-white, bg-gray-50, shadow-sm) look the same wherever they sit: a card in a modal is the same gray as a card on the page, and nesting loses its depth. A surface states its level instead; its tone, light and shadow follow from what it sits on.
- `raised`: Sits above what it's on: one step lighter. The higher it is, the more light on its top edge and the longer its shadow. Cards, popovers, buttons. When: Things that sit on top and hold content or take an action: cards, popovers, menus, dialogs, filled buttons. Not layout wrappers, and not every row of a list.
- `flat`: Same plane as what it sits on: takes that tone, separated only by a hairline. Outlined groups, rows, ghost controls. When: A group on its parent's plane that still needs an edge: outlined panels, table rows, segmented controls, ghost buttons. Without a visible edge, leave the element without a surface.
- `sunken`: Recessed into what it's on: one step darker, inner shadow. Inputs, wells, tracks, code. When: What you type into or look into: inputs, search fields, wells, code blocks, progress and slider tracks. Not the body of a card.
- `ground`: Back to the page tone wherever it is nested. Page regions, full-bleed sections. When: Back to the page tone deep in a tree: page regions and full-bleed sections inside a raised shell. Rarely needed.
- Keep layout, spacing, radius and typography. It owns only the neutral material: brand colors stay unless data-color is set too.
- Neutral text and dividers inside it inherit the material: use text-ink, text-ink-muted, text-ink-faint, border-edge, divide-edge instead of fixed grays.
- Never repeat a surface on wrappers that are only layout: a new surface is a new material.

**data-color** — What the element is made of: neutral, the accent (the brand color) or a hue color, solid or as a tint. Colors share one chroma, tone and step scale. On a surface it's the material; on anything else, only the ink, kept legible.
Why it exists: Palette classes (bg-blue-500, text-red-600, bg-red-50) pick a value and ignore what's under it: the same badge reads differently on each surface, and every hue needs its own hand-picked shades. A material keeps one chroma, tone and step scale for every hue, so a color sits right on any level and its ink stays legible.
- `accent`: The brand color, lit by elevation like any surface: exactly the brand color on the page plane, lighter per level up and darker per level down by Step scale. What sits on it takes accent tones. Primary buttons, switches that are on, links. When: The one action or state that matters most where it sits (the primary button, a switch that is on) and links. Not decoration, and not large areas.
- `neutral`: Back to the neutral material inside a color: its tone follows elevation again. A switch knob, a white card in a brand section. When: Only inside a colored element, for the parts that stay neutral.
- `red`: Danger, errors, destructive actions. Same chroma, tone and step scale as the accent. When: Errors and destructive actions only: a delete button, an error message, a failed status.
- `orange`: Warnings that need attention. Same chroma, tone and step scale as the accent. When: Warnings that need action soon: an expiring plan, a degraded service.
- `yellow`: Alerts and pending states. Same chroma, tone and step scale as the accent. When: Alerts and in-between states: pending, in review, attention without urgency.
- `green`: Success: done, healthy, ready. Same chroma, tone and step scale as the accent. When: Success and healthy states: done, active, paid, online.
- `teal`: Secondary information. Same chroma, tone and step scale as the accent. When: Secondary information that needs a color of its own next to blue.
- `blue`: Information. Same chroma, tone and step scale as the accent. When: Neutral information: tips, info badges, informational callouts.
- `purple`: Highlights: new, beta. Same chroma, tone and step scale as the accent. When: Highlights that mark something as new: new, beta, pro.
- `pink`: Categories and tags. Same chroma, tone and step scale as the accent. When: Categories and tags that only need to look different from one another.
- `tint`, after a value (`accent tint`): The color as a dye instead of a pigment: a neutral surface leaning toward the color by Tint strength, with that share of its chroma, and text in the color. Status badges, callouts, soft buttons. When: Soft versions of a color: status badges, callouts, soft buttons, a selected row. The solid color is for the main action.
- On a surface, data-color sets its material; keep data-surface for elevation. Surfaces inside a colored one take tones of that color relative to it.
- Tinted fills (a light colored background with colored text) take the tint modifier: data-color="red tint" on a surface.
- Mark parts that stay neutral inside a color with data-color="neutral": a switch knob, a white card in a brand section.
- On an element without data-surface (links, icons, labels, ghost buttons) it colors only the ink, adjusted to stay legible.
- Use hue colors for meaning instead of palette colors: red for danger, orange or yellow for warnings, green for success, blue or teal for information.
- Focus rings, native controls and chart marks keep the accent token: ring-accent, accent-accent, bg-accent/80.

**data-response** — What the element answers to, in any mix. The physics is always the same: attention brings it closer, a press pushes it in. Values combine, separated by spaces.
Why it exists: Hover and press classes (hover:bg-*, hover:shadow-*, active:scale-*) each invent their own motion, so similar controls answer differently. One law keeps every element coherent: attention brings it closer, a press pushes it in.
- `hover`: Rises while the pointer is over it. When: Elements that react to the pointer and lead somewhere: buttons, clickable cards, list rows, links styled as surfaces. Not static content.
- `focus`: Rises while it's in use: a field being typed in, or keyboard focus. When: Fields, and anything reached by keyboard that should rise while in use.
- `click`: Sinks below its rest while pressed. When: Anything people press: buttons, toggles, clickable cards and rows.
- A response only moves the element's level; tone, light and shadow come from the surface settings.
- Without data-surface the element is invisible at rest and only shows while it moves (ghost buttons, list rows).
- Elements without data-response don't move at all. Typical sets: buttons `hover click`, fields `focus`, cards `hover`.

**data-corner** — The element's radius: concentric with the shape it sits in (the default), or its own, which the shapes inside then follow.
Why it exists: rounded-* on every element breaks the curves: a rounded button inside a rounded card rarely lines up with it. Corners follow the shape they sit in (concentric) unless a shape takes a radius of its own, which the shapes inside then follow.
- `concentric` (the default: what an element is without the attribute): Follows the curve of the shape it sits in: that shape's radius minus the padding between them, at least Minimum × its radius. Every surface without a radius of its own does this while Concentric corners is on. When: The default: leave it unset on surfaces. Set it only on a wrapper or a painted element that should follow the curve it sits in.
- `0`: No rounding, its own: the shapes inside start over from square. When: Shapes that meet an edge: full-bleed sections, a table flush with its card, a toolbar docked to the window.
- `0.25`: 0.25× the base radius, its own: the shapes inside follow its curve. When: A radius of its own, smaller than the base: dense controls, tags, small thumbnails.
- `0.5`: 0.5× the base radius, its own: the shapes inside follow its curve. When: A radius of its own, smaller than the base: dense controls, tags, small thumbnails.
- `0.75`: 0.75× the base radius, its own: the shapes inside follow its curve. When: A radius of its own, smaller than the base: dense controls, tags, small thumbnails.
- `1`: The base radius, its own: the shapes inside follow its curve. When: A shape that starts a tree: a card on the page, a dialog, a popover.
- `1.25`: 1.25× the base radius, its own: the shapes inside follow its curve. When: A radius of its own, larger than the base: hero cards, large media, marketing sections.
- `1.5`: 1.5× the base radius, its own: the shapes inside follow its curve. When: A radius of its own, larger than the base: hero cards, large media, marketing sections.
- `2`: 2× the base radius, its own: the shapes inside follow its curve. When: A radius of its own, larger than the base: hero cards, large media, marketing sections.
- `pill`: Fully round ends, its own: concentric shapes inside stay pills. When: Chips, badges, toggles and buttons meant to be round.
- Radius is all it owns: keep padding, layout, borders and colors.
- While the Concentric corners setting is on, every surface (data-surface, data-response) is concentric: it follows the curve of the shape it sits in, and rounded-* classes on it have no effect. Don't add data-corner to make a surface concentric.
- data-corner gives an element a radius of its own, and the tree starts over there: the shapes inside follow it. Remove the element's rounded-* classes.
- The space between a shape and what sits in it comes from Tailwind padding classes (p-*, px-*, pt-*…): keep padding in classes, not inline styles or custom CSS.
- Elements that are neither a surface nor data-corner don't take part: a wrapper with padding between two shapes hides that space, and an element painted by classes (a menu item with hover:bg-*) keeps its own radius. Give them data-corner="concentric"; a wrapper has no paint, so its radius never shows.
- A child flush with a shape's edge, like a header at its top, reads the shape's radius from `--corner-r`: rounded-t-(--corner-r).

**data-density** — How much room the element and everything inside take, relative to its context: padding, gaps, control sizes and text. Set it on a region, not on each control.
Why it exists: Size classes on every control (h-8, px-3, text-sm) make a dense toolbar and a roomy form impossible to change together. Density belongs to a region: everything inside scales with it.
- `tighter`: Two steps denser than its context: less padding and gaps, smaller controls and text. Dense tables, inspectors. When: Data-heavy regions where scanning matters more than reading: dense tables, inspectors, logs.
- `tight`: One step denser than its context. Toolbars, sidebars, menus, secondary panels. When: Chrome around the content: toolbars, sidebars, menus, secondary panels.
- `same` (the default: what an element is without the attribute): As dense as its context. When: The default: leave it unset.
- `loose`: One step roomier than its context. Forms, settings, onboarding. When: Regions people fill in or read slowly: forms, settings, onboarding.
- `looser`: Two steps roomier than its context. Heroes, empty states, landing sections. When: Moments that need air: heroes, empty states, landing sections.
- Density is a context: set it on the region (a toolbar, a sidebar, a card, a form), not on each control. Everything inside follows it.
- It owns no classes: padding, gap, size and text classes stay as they are, and scale with it. Keep them on Tailwind's scale (p-3, gap-2, h-9, size-4, text-sm): arbitrary values (p-[13px], text-[11px]) don't follow.
- Steps are relative to the context: tight inside a tight region is tighter.

**data-text** — What the text is: a role that sets its size, line height, letter spacing and, for titles, weight, and how much it stands out. Everything inside inherits it until another role.
Why it exists: Size, weight and gray classes chosen per element drift apart, so two card titles end up at two sizes. A role says what the text is; its size, line height, tracking, weight and ink come from the role and from the density around it.
- `display`: The page title, or a hero line. Once per page. When: The one page title or hero line, at most once per page.
- `figure`: A number that is the point: a total, a stat, a price. When: A number that is the content itself: a total, a stat, a price. Not a number inside a sentence.
- `title`: The title of a section or a dialog. When: The title of a page section or a dialog.
- `heading`: The title of a card, a group or a list item. When: The title of a card, a group or a list item, however short.
- `body`: Prose: descriptions and paragraphs, with room between lines. When: Prose meant to be read: descriptions, paragraphs, help text longer than a line.
- `label`: Interface text: controls, fields, menus, table cells. Body size, tighter lines. When: Interface text: buttons, fields, menu items, table cells, navigation. Set it on the app's root: it's what most text inherits.
- `caption`: Secondary text: hints, metadata, timestamps, badges. When: Supporting text: hints, metadata, timestamps, badges.
- `muted`, after a value (`display muted`): Secondary text: the ink of what it sits on, softened. Descriptions, details under a title. When: Secondary text under or beside the main one: descriptions, details under a title.
- `faint`, after a value (`display faint`): Tertiary text: softer still. Timestamps, metadata, placeholders, hints. When: Tertiary text: timestamps, metadata, placeholders, hints.
- Pick a role by what the text is (a card title is heading however short), not by the size you want.
- Set it on the element that holds the text, or on a container: everything inside inherits it until another data-text.
- Its ink is a modifier after the role: data-text="label muted" for secondary text (was text-ink-muted), "caption faint" for tertiary (was text-ink-faint); no modifier is full ink. One ink at most: never muted and faint together. Hover colors (hover:text-ink) stay as classes.
- Keep brand and status colors, font-mono, font-medium on labels, uppercase, tabular-nums and truncation: a role owns size, line height, letter spacing, the weight of titles and the ink level.
- Sizes follow density: a label in a tight toolbar is smaller, and a caption next to it shrinks in proportion.

## 5. From classes to attributes

Convert an element in one go: set its attribute, remove the classes it replaces, and convert the neutral colors inside it. An element that keeps both shows a mix: Tailwind's classes win over the attribute, except radii, which the corners always set.

### data-surface

Replaces neutral backgrounds (bg-white, bg-gray-*, bg-neutral-*, dark:bg-*), neutral text colors (text-gray-*, dark:text-*), neutral border/ring/divide colors and box shadows (shadow-*).

- Cards, popovers, dialogs, menus and filled buttons: `raised`. Remove bg-white and shadow-*.
- Outlined groups, rows and chips that keep the tone of what they sit on: `flat`. Remove their border-gray-* (the hairline is drawn for them).
- Inputs, wells, tracks and code blocks, darker and recessed: `sunken`.
- Page regions and full-bleed sections back on the page tone: `ground`. Layout-only wrappers get nothing.
- Inside a surface: border-gray-* → border-edge, divide-gray-* → divide-edge; text colors become text roles (see data-text).
- Dark mode comes from a `dark` class or data-theme="dark" on <html>: delete dark:bg-*, dark:text-* and dark:border-* as you go.

### data-color

Replaces colored fills and text on the element: brand and palette backgrounds (bg-accent, bg-blue-600, bg-red-500, bg-emerald-*…) with text-white, tinted backgrounds (bg-red-500/10, bg-emerald-50…) with their colored text, the hover:/active: variants of both, or colored text and icons (text-accent, text-red-600, text-emerald-500…).

- Brand fills (bg-indigo-600 text-white and the like): data-color="accent" on the surface. Set accent-hue, accent-chroma and accent-tone in the @plugin block to the brand color.
- Status fills (bg-red-600, bg-green-500): the hue (`red`, `green`…). Light status backgrounds with colored text (bg-red-50 text-red-700): the hue with `tint`.
- Colored text and icons without a fill (links, status words): data-color on the element itself, no surface.

### data-response

Replaces hover, focus, active and pressed styling (hover:bg-*, focus:bg-*, active:bg-*, hover:shadow-*, active:shadow-*, hover:-translate-y-*, active:scale-* and the like).

- Buttons: `hover click`. Fields: `focus`. Clickable cards: `hover`.
- Ghost buttons, menu items and list rows (no fill at rest): data-response without data-surface; they show a fill only while they move.
- Remove hover:bg-*, active:bg-*, focus:bg-*, hover:shadow-*, active:scale-* and hover:-translate-y-*. Keep focus-visible rings.

### data-corner

Replaces border-radius utilities (rounded, rounded-*, rounded-t-*, rounded-s-* and the like).

- Remove rounded-* from surfaces: they're concentric with the shape they sit in.
- A shape that starts the tree over (a card at the top of a page, a dialog, a popover): data-corner="1", or another multiple of the base radius. Pills: `pill`. Flush or attached shapes: `0`.
- Images, avatars and items painted by classes rather than a surface that should follow the curve: data-corner="concentric".
- Keep paddings as Tailwind classes (p-*, px-*…): they're the distance the corners subtract. A wrapper that adds padding between two shapes gets data-corner="concentric".
- A child flush with the top of a shape (a sticky header): rounded-t-(--corner-r).

### data-density

- Remove size props and size variants from components: each keeps one base size, the medium one.
- A small variant becomes data-density="tight": on the region that holds them (a toolbar, a table, a sidebar), or on one control that should recede. A large one becomes `loose`.
- Keep spacing, sizes and text on Tailwind's scale (p-3, h-9, size-4); move arbitrary values (h-[34px], p-[13px]) to the nearest step, or they won't follow.

### data-text

Replaces text size, line height and letter-spacing classes (text-xs … text-9xl, text-[…px], leading-*, tracking-*), font-semibold or font-bold on display, figure, title and heading, which set their weight, and text-ink, text-ink-muted and text-ink-faint, which the muted and faint modifiers replace.

- text-xs → caption; text-sm → label (interface text) or body (prose); text-base → body; text-lg → heading; text-xl → title; text-2xl → figure for numbers, title otherwise; text-3xl and up → display.
- Remove leading-*, tracking-* and the font-semibold or font-bold of titles. Keep font-medium on labels.
- Ink: text-gray-500/600 and text-ink-muted → `muted`; text-gray-400 and text-ink-faint → `faint` (data-text="label muted"). Full ink is no modifier.
- Put data-text="label" on the app's root element, so text without a role is interface text.

## 6. Order

1. Install, and check the app (section 3).
2. Shared components first: buttons, inputs, selects, cards, badges, menus, dialogs, tabs. One change there reaches every screen. This is where size props go: one size each, and data-density for the rest.
3. The app shell: the page ground, sidebar, header and main regions. Put data-text="label" on the root.
4. Screens, one at a time: cards, lists, tables, forms.
5. Finish (section 8).

## 7. What's required and what isn't

- Required: the plugin, and on every element you convert, the attribute instead of the classes it replaces.
- Not every element needs one: layout wrappers (flex, grid, gaps, positioning), icons, images, charts and third-party widgets stay as they are. Never repeat an attribute on a wrapper that only does layout.
- Keep layout and spacing classes (flex, grid, gap-*, p-*, m-*, w-*, h-*): surfacent reads paddings, it doesn't replace them.
- Optional: the surfacent toolbar (development only), for people to pick an element and send you its intent; turning off Tailwind's scales at the end (section 8); fonts and other @theme choices.

## 8. Finish

Search for what's left. Each match is either converted or a deliberate exception (brand artwork, charts, third-party code):

```bash
rg -n -e '\b(dark:)?(bg|border|divide|ring)-(white|black|gray|neutral|zinc|slate|stone)(-[0-9]+)?\b|\bshadow(-[a-z0-9]+)?\b' src   # data-surface
rg -n -e '\b(bg|text|border|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\b' src   # data-color
rg -n -e '\b(hover|active|focus):(bg|shadow|scale|-?translate)-' src   # data-response
rg -n -e '\brounded(-|\b)' src   # data-corner
rg -n -e '\b(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|inset)-\[[0-9]' src   # data-density
rg -n -e '\btext-(xs|sm|base|lg|[2-9]?xl)\b|\btext-\[[0-9]|\btext-(gray|neutral|zinc|slate|stone)-[0-9]+|\bleading-|\btracking-' src   # data-text
```

Then lock it in, so the old classes can't come back:

- Turn off Tailwind's text scale once nothing uses it: `@theme { --text-*: initial; }` in the CSS that imports Tailwind.

## 9. Keep it this way

Add this to the app's AGENTS.md or CLAUDE.md, so later changes follow surfacent too:

```md
## Styling with surfacent

Elements say what they are with data attributes (data-surface, data-color, data-response, data-corner, data-density, data-text), and surfacent's Tailwind plugin (`surfacent/tailwind`) derives colors, radii, sizes and text from its `@plugin` block, relative to where each element sits. In new UI, don't write neutral colors (bg-white, bg-gray-*, text-gray-*, border-gray-*), shadows, rounded-*, text sizes or size props: set the attribute.

Prompts from the surfacent toolbar say things like `Set data-surface="raised" on this element` with a source location. Edit that element: add the attribute and remove the classes the prompt says it now owns.
```
