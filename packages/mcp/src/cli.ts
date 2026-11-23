#!/usr/bin/env node
// surfacent mcp: the toolbar's server (HTTP) and the agent's tools (MCP on stdio).
//
//   surfacent mcp              both; what an agent's MCP config runs
//   surfacent mcp --http-only  only the toolbar's side, e.g. from a terminal
//   surfacent mcp --mcp-only   only the tools, on a server already running
//
// Options: --port <n> (default 4848, or SURFACENT_PORT), --store <file>
// (default ~/.surfacent/annotations.json). If the port is taken by another
// surfacent server, the tools use that one. Logs go to stderr: stdout is MCP.

import { homedir } from "node:os";
import { join } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Api } from "./api.ts";
import { createHttpServer, NAME } from "./http.ts";
import { createMcpServer } from "./mcp.ts";
import { Store } from "./store.ts";

const log = (message: string) => process.stderr.write(`[surfacent] ${message}\n`);

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

// `server` was the command before the package was published; agent configs may still use it.
const command = process.argv[2] ?? "mcp";
if (command !== "mcp" && command !== "server") {
  log("Usage: surfacent mcp [--http-only | --mcp-only] [--port 4848] [--store <file>]");
  process.exit(command === "help" ? 0 : 1);
}

const port = Number(option("port") ?? process.env.SURFACENT_PORT ?? 4848);
const base = `http://127.0.0.1:${port}`;

// The store saves a moment after each change: write what's waiting before the process goes.
let store: Store | undefined;
process.on("exit", () => store?.flush());
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(signal, () => process.exit(0));

/** Starts the HTTP side, or reports that another surfacent server already has the port. */
async function serve(): Promise<"started" | "shared"> {
  const owned = new Store(option("store") ?? join(homedir(), ".surfacent", "annotations.json"));
  const server = createHttpServer(owned);
  const listening = await new Promise<boolean>((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => (error.code === "EADDRINUSE" ? resolve(false) : reject(error)));
    server.listen(port, "127.0.0.1", () => resolve(true));
  });
  if (listening) {
    store = owned;
    log(`toolbar server on ${base}`);
    return "started";
  }
  const health = await new Api(base).health().catch(() => undefined);
  if (health?.name !== NAME) throw new Error(`Port ${port} is taken by something else. Pass --port.`);
  log(`using the surfacent server already on ${base}`);
  return "shared";
}

try {
  if (!flag("mcp-only")) await serve();
  if (!flag("http-only")) {
    await createMcpServer(new Api(base)).connect(new StdioServerTransport());
    log("MCP tools ready on stdio");
  }
} catch (error) {
  log(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
