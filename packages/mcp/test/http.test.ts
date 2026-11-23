import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { isDevOrigin, isLocalHost, isLoopbackAddress } from "../src/policy.ts";
import { note, openStream, raw, startServer } from "./helpers.ts";

let server: Awaited<ReturnType<typeof startServer>>;
before(async () => {
  server = await startServer();
});
after(() => server.close());

test("only this machine's host names are served (DNS rebinding sends another Host)", async () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "myapp.localhost"]) {
    const response = await raw(server.port, { headers: { Host: `${host}:${server.port}` } });
    assert.equal(response.status, 200, host);
  }
  for (const host of ["evil.example", `evil.example:${server.port}`, `10.0.0.5:${server.port}`]) {
    const response = await raw(server.port, { headers: { Host: host } });
    assert.equal(response.status, 403, host);
  }
});

test("dev origins get CORS headers; other origins are refused before any route runs", async () => {
  const allowed = await raw(server.port, { headers: { Origin: "http://localhost:5287" } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:5287");
  assert.equal(allowed.headers.vary, "Origin");

  const sessionsBefore = server.store.sessions().length;
  const refused = await raw(server.port, {
    method: "POST",
    path: "/sessions",
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://evil.example/" }),
  });
  assert.equal(refused.status, 403);
  assert.equal(refused.headers["access-control-allow-origin"], undefined);
  assert.equal(server.store.sessions().length, sessionsBefore);

  const nullOrigin = await raw(server.port, { headers: { Origin: "null" } });
  assert.equal(nullOrigin.status, 403);
});

test("clients without an Origin (agents, curl) are served without CORS headers", async () => {
  const response = await raw(server.port, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers["access-control-allow-origin"], undefined);
});

test("preflight answers 204 with the allowed methods and headers", async () => {
  const response = await raw(server.port, {
    method: "OPTIONS",
    path: "/sessions",
    headers: { Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "POST" },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers["access-control-allow-origin"], "http://127.0.0.1:5173");
  assert.match(String(response.headers["access-control-allow-methods"]), /PATCH/);
  assert.match(String(response.headers["access-control-allow-headers"]), /Last-Event-ID/);
  assert.equal(response.headers["access-control-max-age"], "86400");
});

test("event streams carry CORS headers for the toolbar's page", async () => {
  const session = server.store.createSession("http://localhost:5287/");
  for (const path of ["/events", `/sessions/${session.id}/events`]) {
    const response = await openStream(server.port, path, { Origin: "http://localhost:5287" });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers["content-type"], "text/event-stream", path);
    assert.equal(response.headers["access-control-allow-origin"], "http://localhost:5287", path);
  }
});

test("routes validate their input and answer 404 for anything else", async () => {
  const session = server.store.createSession("http://localhost:5287/");
  const missing = await raw(server.port, {
    method: "POST",
    path: `/sessions/${session.id}/annotations`,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note({ elementPath: "" })),
  });
  assert.equal(missing.status, 400);
  assert.match(missing.body, /Missing elementPath/);

  const badJson = await raw(server.port, { method: "POST", path: "/sessions", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(badJson.status, 400);

  assert.equal((await raw(server.port, { path: "/sessions/nope" })).status, 404);
  assert.equal((await raw(server.port, { path: "/actions" })).status, 404);
  assert.equal((await raw(server.port, { method: "POST", path: `/sessions/${session.id}/action`, body: "{}" })).status, 404);
});

test("the policy's building blocks", () => {
  assert.equal(isLoopbackAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("192.168.0.2"), false);
  assert.equal(isLocalHost(undefined), true);
  assert.equal(isLocalHost("app.localhost:5287"), true);
  assert.equal(isLocalHost("localhost.evil.example"), false);
  for (const origin of ["http://localhost:3000", "https://myapp.localhost", "http://192.168.1.20:5173", "http://172.20.0.3:8080", "https://shop.test"]) {
    assert.equal(isDevOrigin(origin), true, origin);
  }
  for (const origin of ["https://example.com", "http://172.32.0.1", "file:///tmp/x.html", "null", "https://localhost.example.com"]) {
    assert.equal(isDevOrigin(origin), false, origin);
  }
});
