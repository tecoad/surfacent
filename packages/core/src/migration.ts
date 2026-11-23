// The migration prompt: what an app's coding agent needs to move an interface
// to surfacent. It's generated from the aspect registry, like every other
// prompt, so a new aspect, value or setting shows up in it by itself.

import { PACKAGE, agentGuide, aspects, normalizeSetting, resolveSettings, settings } from "./index.ts";
import { PHILOSOPHY } from "./philosophy.ts";
import type { SettingValues } from "./types.ts";

/** The `@plugin` block with these values, dark ones where a setting is themed. */
function pluginBlock(values: SettingValues, dark: SettingValues): string {
  const lines = settings.flatMap((setting) => {
    const line = `  ${setting.key}: ${normalizeSetting(setting, values[setting.key] ?? setting.default)};`;
    if (setting.darkDefault === undefined) return [line];
    return [line, `  ${setting.key}-dark: ${normalizeSetting(setting, dark[setting.key] ?? setting.darkDefault)};`];
  });
  return [`@import "tailwindcss";`, "", `@plugin "${PACKAGE.plugin}" {`, ...lines, "}"].join("\n");
}

const attributes = () => aspects.map((aspect) => aspect.attribute).join(", ");

/** An element whose intents are already decided (a suggestion the person accepted), for the migration prompt. */
export interface MigrationElement {
  /** The page it's on. */
  page: string;
  /** How the toolbar names it, e.g. `button "Deploy"`. */
  element: string;
  /** path:line:column of its JSX, when known. */
  source?: string;
  /** The instruction for the element: the intents to set and the classes they replace. */
  instruction: string;
}

/**
 * The prompt a person gives their agent to migrate an app. `settings` are the
 * values to put in the `@plugin` block, light and dark: the toolbar passes the
 * ones on the page; without them the defaults are used. `elements` are
 * elements already decided, by page: suggestions the person accepted.
 */
export function migrationPrompt(options: { settings?: SettingValues; dark?: SettingValues; elements?: MigrationElement[] } = {}): string {
  const defaults = resolveSettings();
  const values = { ...defaults.light, ...options.settings };
  const dark = { ...defaults.dark, ...options.dark };
  const out: string[] = [];
  const add = (...lines: string[]) => out.push(...lines);

  add(
    "# Migrate this interface to surfacent",
    "",
    "You're moving this app's UI to surfacent. Instead of choosing colors, radii and sizes for each element, every element says what it is with a data attribute (`data-surface=\"raised\"`, `data-text=\"label muted\"`…), and surfacent's Tailwind plugin derives the CSS from a few settings, relative to where the element sits. A raised card inside a raised card is one step lighter again; a button inside a card follows the card's corner. Work through this document in order.",
    "",
    PHILOSOPHY.trimEnd(),
    "",
    "## 1. Requirements",
    "",
    "- Tailwind CSS v4, configured in CSS (`@import \"tailwindcss\"`). surfacent is a Tailwind plugin: it doesn't work with Tailwind v3 or without Tailwind. If the app isn't on Tailwind v4, stop and say so: that comes first.",
    "- Browsers: Chrome and Edge 125+, Safari 16.4+, Firefox 128+. It relies on @property, oklch(), pow(), round() and :has().",
    "",
    "## 2. Install",
    "",
    "```bash",
    PACKAGE.install,
    "```",
    "",
    "In the CSS file that imports Tailwind, add the plugin with these settings:",
    "",
    "```css",
    pluginBlock(values, dark),
    "```",
    "",
    "Keep the values as they are: people tune them later, live, from the toolbar's Design panel. A dark theme is a `dark` class or `data-theme=\"dark\"` on `<html>`, and changes only the `-dark` settings.",
    "",
    "## 3. What changes as soon as it's installed",
    "",
  );
  for (const aspect of aspects) {
    if (aspect.agent.global) add(`- **${aspect.attribute}**: ${aspect.agent.global}`);
  }
  add(
    "",
    "Everything else applies only where an attribute is set, so the app can move screen by screen. Check that it still looks right after installing, before converting anything.",
    "",
    "## 4. The attributes",
    "",
    agentGuide().trimEnd(),
    "",
    "## 5. From classes to attributes",
    "",
    "Convert an element in one go: set its attribute, remove the classes it replaces, and convert the neutral colors inside it. An element that keeps both shows a mix: Tailwind's classes win over the attribute, except radii, which the corners always set.",
  );
  for (const aspect of aspects) {
    if (!aspect.agent.replaces && !aspect.agent.migrate?.length) continue;
    add("", `### ${aspect.attribute}`, "");
    if (aspect.agent.replaces) add(`Replaces ${aspect.agent.replaces}.`, "");
    for (const hint of aspect.agent.migrate ?? []) add(`- ${hint}`);
  }
  const elements = options.elements ?? [];
  if (elements.length) {
    add("", "### Elements already decided", "", "The person reviewed these elements on the page and accepted their intents: convert them as they say.", "");
    for (const page of new Set(elements.map((entry) => entry.page))) {
      add(`#### ${page}`, "");
      for (const entry of elements.filter((item) => item.page === page)) {
        add(`- **${entry.element}**${entry.source ? ` (${entry.source})` : ""}`);
        for (const line of entry.instruction.split("\n")) add(`  - ${line}`);
      }
      add("");
    }
  }
  add(
    "",
    "## 6. Order",
    "",
    "1. Install, and check the app (section 3).",
    "2. Shared components first: buttons, inputs, selects, cards, badges, menus, dialogs, tabs. One change there reaches every screen. This is where size props go: one size each, and data-density for the rest.",
    "3. The app shell: the page ground, sidebar, header and main regions. Put data-text=\"label\" on the root.",
    "4. Screens, one at a time: cards, lists, tables, forms.",
    "5. Finish (section 8).",
    "",
    "## 7. What's required and what isn't",
    "",
    "- Required: the plugin, and on every element you convert, the attribute instead of the classes it replaces.",
    `- Not every element needs one: layout wrappers (flex, grid, gaps, positioning), icons, images, charts and third-party widgets stay as they are. Never repeat an attribute on a wrapper that only does layout.`,
    "- Keep layout and spacing classes (flex, grid, gap-*, p-*, m-*, w-*, h-*): surfacent reads paddings, it doesn't replace them.",
    "- Optional: the surfacent toolbar (development only), for people to pick an element and send you its intent; turning off Tailwind's scales at the end (section 8); fonts and other @theme choices.",
    "",
    "## 8. Finish",
    "",
    "Search for what's left. Each match is either converted or a deliberate exception (brand artwork, charts, third-party code):",
    "",
    "```bash",
  );
  for (const aspect of aspects) {
    if (aspect.agent.find) add(`rg -n -e '${aspect.agent.find}' src   # ${aspect.attribute}`);
  }
  add("```", "");
  const strict = aspects.filter((aspect) => aspect.agent.strict);
  if (strict.length) {
    add("Then lock it in, so the old classes can't come back:", "");
    for (const aspect of strict) add(`- ${aspect.agent.strict}`);
    add("");
  }
  add(
    "## 9. Keep it this way",
    "",
    "Add this to the app's AGENTS.md or CLAUDE.md, so later changes follow surfacent too:",
    "",
    "```md",
    "## Styling with surfacent",
    "",
    `Elements say what they are with data attributes (${attributes()}), and surfacent's Tailwind plugin (\`${PACKAGE.plugin}\`) derives colors, radii, sizes and text from its \`@plugin\` block, relative to where each element sits. In new UI, don't write neutral colors (bg-white, bg-gray-*, text-gray-*, border-gray-*), shadows, rounded-*, text sizes or size props: set the attribute.`,
    "",
    "Prompts from the surfacent toolbar say things like `Set data-surface=\"raised\" on this element` with a source location. Edit that element: add the attribute and remove the classes the prompt says it now owns.",
    "```",
  );
  return `${out.join("\n")}\n`;
}
