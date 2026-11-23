// Shared by the tests: a server on a free port with its own store, and raw
// requests that can send the headers fetch won't let a test choose (Host).

import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { mkdtempSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Api } from "../src/api.ts";
import { createHttpServer } from "../src/http.ts";
import { Store } from "../src/store.ts";
import type { Annotation } from "../src/types.ts";

export async function startServer(store = new Store()) {
  const server = createHttpServer(store);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  return {
    store,
    port,
    base,
    api: new Api(base),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/** A file path in a new temporary folder. */
export const tempFile = (name = "annotations.json") => join(mkdtempSync(join(tmpdir(), "surfacent-test-")), name);

/** A valid annotation body, as the toolbar posts it. */
export const note = (overrides: Partial<Annotation> = {}): Partial<Annotation> => ({
  id: `n_${Math.random().toString(36).slice(2, 10)}`,
  comment: 'Set data-surface="raised" on this element.',
  element: "div.card",
  elementPath: "main > div.card",
  timestamp: Date.now(),
  x: 10,
  y: 20,
  intents: { surface: "raised" },
  ...overrides,
});

/** Sends a request with exactly these headers, and reads the whole answer. */
export function raw(
  port: number,
  { method = "GET", path = "/health", headers = {}, body }: { method?: string; path?: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; headers: IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest({ host: "127.0.0.1", port, method, path, headers, setHost: !("Host" in headers) }, (response) => {
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: data }));
    });
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

/** Opens a stream and returns its status and headers, then closes it. */
export function openStream(port: number, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; headers: IncomingHttpHeaders }>((resolve, reject) => {
    const outgoing = httpRequest({ host: "127.0.0.1", port, path, headers }, (response) => {
      resolve({ status: response.statusCode ?? 0, headers: response.headers });
      response.destroy();
    });
    outgoing.on("error", reject);
    outgoing.end();
  });
}

/** Polls until `check` passes, or fails after `ms`. */
export async function until(check: () => Promise<boolean> | boolean, ms = 3000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for the condition");
}
