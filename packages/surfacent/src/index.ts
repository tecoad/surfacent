// The toolbar, as apps import it: `import { Surfacent } from "surfacent"`.
// Render it in development only; it reaches surfacent's MCP server and the
// Vite plugin's routes by itself. A relative path, so its types are bundled in.

export { Surfacent } from "../../tool/src/index";
export type { SurfacentProps } from "../../tool/src/index";
