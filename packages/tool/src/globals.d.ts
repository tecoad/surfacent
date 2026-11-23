// Build-time constants injected by tsup
declare const __VERSION__: string;


// The toolbar's Tailwind UI, compiled by the Vite plugin (vite.ts).
declare module "virtual:surfacent-ui-css" {
  /** For the toolbar's shadow root. */
  export const css: string;
  /** `@property` rules, which only work at the document level. */
  export const properties: string;
}
