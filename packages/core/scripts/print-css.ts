// Prints the CSS every aspect generates with default settings: `npm run css`.
import { DARK_SELECTOR, aspects, cssContext, resolveSettings, settingsToVars, toCss } from "../src/index.ts";

const { light, dark } = resolveSettings();
let css = toCss({ ":root": settingsToVars(light), [DARK_SELECTOR]: settingsToVars(dark) });
for (const aspect of aspects) {
  css += `\n/* ${aspect.label} */\n`;
  css += toCss(aspect.css(cssContext(aspect, light)));
}
process.stdout.write(css);
