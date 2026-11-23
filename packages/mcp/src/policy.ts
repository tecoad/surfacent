// Who may talk to the server: the developer's own browser and agents on this
// machine. What the toolbar sends becomes instructions for a coding agent, so
// pages on other origins (or DNS-rebinding hosts) can't create or read notes.

import type { IncomingMessage } from "node:http";

const IPV4_LOOPBACK = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/** The socket's peer is this machine. */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const plain = address.replace(/^::ffff:/i, "");
  return plain === "::1" || IPV4_LOOPBACK.test(plain);
}

/** The Host header names this machine: what a DNS-rebinding page can't send. A missing Host is allowed (HTTP/1.0). */
export function isLocalHost(host: string | undefined): boolean {
  if (!host) return true;
  const value = host.trim().toLowerCase();
  const name = value.startsWith("[") ? value.slice(0, value.indexOf("]") + 1) : value.replace(/:\d+$/, "");
  return name === "localhost" || name.endsWith(".localhost") || IPV4_LOOPBACK.test(name) || name === "[::1]" || name === "::1";
}

/** Origins a dev server can plausibly run on: this machine, the local network, and local-only domains. */
export function isDevOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "[::1]") return true;
  if (IPV4_LOOPBACK.test(host) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  const private172 = host.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;
  return host.endsWith(".local") || host.endsWith(".test") || host.endsWith(".internal");
}

export const CORS_PREFLIGHT = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Last-Event-ID",
  "Access-Control-Max-Age": "86400",
};

/**
 * Checks a request before any route runs. Returns the CORS headers its
 * response carries, or the reason it's refused.
 */
export function admit(request: IncomingMessage): { headers: Record<string, string> } | { refused: string } {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return { refused: "Only this machine can reach the surfacent server." };
  if (!isLocalHost(request.headers.host)) return { refused: "Host not allowed" };
  const origin = request.headers.origin;
  // No Origin: a same-origin request or a non-browser client (an agent, curl).
  if (!origin) return { headers: {} };
  if (!isDevOrigin(origin)) return { refused: "Origin not allowed" };
  return { headers: { "Access-Control-Allow-Origin": origin, Vary: "Origin" } };
}
