// surfacent's Vite plugin, for apps in development:
//
// - Serves /__surfacent/settings so the toolbar can read and write the
//   settings in the `@plugin "surfacent/tailwind"` block of your CSS (Save).
// - Serves /__surfacent/mcp for the toolbar's MCP page: whether surfacent's
//   MCP server is running, and the commands that start it.
//
// The toolbar itself comes compiled; this repo's demo compiles it from source
// with `surfacentSource()` from ./dev.ts.

import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import type { Plugin } from "vite";

// `@plugin "surfacent/tailwind"` in apps, or a relative path to
// core/src/tailwind.ts where aspects are developed (Tailwind only hot-reloads
// plugins imported by relative path).
const PLUGIN_BLOCK = /(@plugin\s+(["'])[^"']*(?:surfacent\/tailwind|core\/src\/tailwind\.ts)\2\s*)(\{[^}]*\}|;)/;

type PluginBlockOptions = Record<string, string>;

// The server only writes what the toolbar sends: the toolbar always has the
// current aspect registry (it hot-reloads), the dev server process doesn't.
const OPTION_KEY = /^[a-z][a-z0-9-]*$/;
const OPTION_VALUE = /^-?(?:\d+\.?\d*|\.\d+)$/;

export interface SurfacentOptions {
  /** CSS file with the `@plugin` block, relative to the Vite root. */
  css?: string;
  /** Port of surfacent's MCP server (its `--port`). Defaults to SURFACENT_PORT, like the server, then 4848. */
  mcpPort?: number;
}

export function surfacent({ css = "src/index.css", mcpPort = Number(process.env.SURFACENT_PORT) || 4848 }: SurfacentOptions = {}): Plugin {
  let cssFile = "";
  return {
    name: "surfacent:settings",
    apply: "serve",
    configResolved(config) {
      cssFile = path.resolve(config.root, css);
    },
    configureServer(server) {
      server.middlewares.use("/__surfacent/settings", async (req, res) => {
        try {
          if (req.method === "GET") {
            return send(res, 200, { file: path.relative(server.config.root, cssFile), options: readOptions(cssFile) });
          }
          if (req.method === "POST") {
            const body = JSON.parse(await readBody(req)) as { options?: Record<string, unknown> };
            const options = writeOptions(cssFile, body.options ?? {});
            return send(res, 200, { file: path.relative(server.config.root, cssFile), options });
          }
          send(res, 405, { error: "Method not allowed" });
        } catch (error) {
          send(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });
      server.middlewares.use("/__surfacent/mcp", async (_req, res) => {
        send(res, 200, await mcpSetup(server.config.root, mcpPort));
      });
    },
  };
}

/** surfacent's MCP server, for the toolbar: whether it runs, and the commands that start it here. */
async function mcpSetup(root: string, port: number) {
  const url = `http://127.0.0.1:${port}`;
  const health = await fetch(`${url}/health`, { signal: AbortSignal.timeout(500) })
    .then((response) => (response.ok ? (response.json() as Promise<{ name?: string }>) : undefined))
    .catch(() => undefined);
  const source = mcpSource(root);
  const server = `${source ? `node ${shellPath(source)}` : "npx -y surfacent"} mcp${port === 4848 ? "" : ` --port ${port}`}`;
  return {
    url,
    running: health?.name === "surfacent",
    commands: { agent: `claude mcp add surfacent -s user -- ${server}`, server: `${server} --http-only` },
  };
}

/** The MCP server's source entry, in surfacent's own repo; apps run the published package. */
function mcpSource(root: string): string | undefined {
  try {
    const manifest = createRequire(path.join(root, "package.json")).resolve("surfacent-mcp/package.json");
    const { bin } = JSON.parse(fs.readFileSync(manifest, "utf8")) as { bin?: Record<string, string> };
    const entry = bin?.["surfacent-mcp"];
    return entry ? fs.realpathSync(path.resolve(path.dirname(manifest), entry)) : undefined;
  } catch {
    return undefined;
  }
}

/** A path to paste in a shell: `~/…` under the home directory, quoted only when it needs it. */
function shellPath(file: string): string {
  const safe = (value: string) => /^[\w@%+=:,./-]+$/.test(value);
  const home = `${os.homedir()}/`;
  if (file.startsWith(home) && safe(file.slice(home.length))) return `~/${file.slice(home.length)}`;
  return safe(file) ? file : `'${file.replace(/'/g, "'\\''")}'`;
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk;
    });
    req.on("end", () => resolve(data || "{}"));
    req.on("error", reject);
  });
}

function parseBlock(block: string): PluginBlockOptions {
  const options: PluginBlockOptions = {};
  if (block === ";") return options;
  for (const declaration of block.slice(1, -1).split(";")) {
    const match = declaration.match(/^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (match) options[match[1]] = match[2];
  }
  return options;
}

function readOptions(file: string): PluginBlockOptions {
  const match = fs.readFileSync(file, "utf8").match(PLUGIN_BLOCK);
  if (!match) throw new Error(`No surfacent @plugin block in ${file}`);
  return parseBlock(match[3]);
}

/** Merges `@plugin` options (already named and normalized by the toolbar) into the block. */
function writeOptions(file: string, updates: Record<string, unknown>): PluginBlockOptions {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(PLUGIN_BLOCK);
  if (!match) throw new Error(`No surfacent @plugin block in ${file}`);
  const options = parseBlock(match[3]);
  for (const [key, value] of Object.entries(updates)) {
    const text = String(value);
    if (!OPTION_KEY.test(key) || !OPTION_VALUE.test(text)) throw new Error(`Invalid option ${key}: ${text}`);
    options[key] = text;
  }
  const block = `{\n${Object.entries(options)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n")}\n}`;
  fs.writeFileSync(file, source.replace(PLUGIN_BLOCK, `$1${block}`));
  return options;
}
