// Includes the acknowledged status, which the toolbar shows as "an agent is
// working on this".

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { subscribeSessionResolutions } from "./session-resolutions";

class Source extends EventTarget {
  static instances: Source[] = [];
  static CLOSED = 2;
  readyState = 1;
  close = vi.fn(() => {
    this.readyState = 2;
  });
  url: string;
  constructor(url: string) {
    super();
    this.url = url;
    Source.instances.push(this);
  }
  fail(state = Source.CLOSED) {
    this.readyState = state;
    this.dispatchEvent(new Event("error"));
  }
}
const snapshot = (annotations: unknown[]) => ({ ok: true, json: async () => ({ annotations }) });
const event = (payload: unknown) => new MessageEvent("annotation.updated", { data: JSON.stringify({ payload }) });
let stop: (() => void) | undefined;
let pending: boolean;
const onStatus = vi.fn();
const fetcher = vi.fn();
const start = () => {
  stop = subscribeSessionResolutions("http://local.test", "one", () => pending, onStatus);
};

beforeEach(() => {
  vi.useFakeTimers();
  Source.instances = [];
  pending = true;
  onStatus.mockReset();
  fetcher.mockReset().mockResolvedValue(snapshot([]));
  vi.stubGlobal("EventSource", Source);
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("reconciles missed statuses, including notes an agent is working on, without touching pending ones", async () => {
  fetcher.mockResolvedValue(
    snapshot([
      { id: "done", status: "resolved" },
      { id: "dismissed", status: "dismissed" },
      { id: "pending", status: "pending" },
      { id: "working", status: "acknowledged" },
    ]),
  );
  start();
  await vi.advanceTimersByTimeAsync(10000);
  expect(onStatus.mock.calls.map(([note]) => note.id)).toEqual(["done", "dismissed", "working"]);
});

it("reports an agent taking a note as it happens", () => {
  pending = false;
  start();
  Source.instances[0]!.dispatchEvent(event({ id: "taken", status: "acknowledged" }));
  Source.instances[0]!.dispatchEvent(event({ id: "edited", status: "pending" }));
  expect(onStatus.mock.calls.map(([note]) => note)).toEqual([{ id: "taken", status: "acknowledged" }]);
});

it("skips idle snapshots but still receives live resolutions", async () => {
  pending = false;
  start();
  Source.instances[0]!.dispatchEvent(new Event("open"));
  await vi.advanceTimersByTimeAsync(30000);
  expect(fetcher).not.toHaveBeenCalled();
  Source.instances[0]!.dispatchEvent(event({ id: "done", status: "resolved" }));
  expect(onStatus).toHaveBeenCalledWith({ id: "done", status: "resolved" });
  pending = true;
  await vi.advanceTimersByTimeAsync(10000);
  expect(fetcher).toHaveBeenCalledOnce();
});

it("allows one snapshot at a time, aborts a slow request and retries on the next check", async () => {
  let signal: AbortSignal | undefined;
  fetcher.mockImplementationOnce(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        signal = options.signal;
        signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
  );
  start();
  Source.instances[0]!.dispatchEvent(new Event("open"));
  Source.instances[0]!.dispatchEvent(new Event("open"));
  expect(fetcher).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(5000);
  expect(signal!.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("lets native reconnect run but recreates terminal streams with capped backoff", async () => {
  pending = false;
  start();
  Source.instances[0]!.fail(0);
  await vi.advanceTimersByTimeAsync(10000);
  expect(Source.instances).toHaveLength(1);
  for (const delay of [1000, 2000, 4000, 8000, 10000, 10000]) {
    const count = Source.instances.length;
    const current = Source.instances[count - 1]!;
    current.fail();
    current.fail();
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(Source.instances).toHaveLength(count);
    await vi.advanceTimersByTimeAsync(1);
    expect(Source.instances).toHaveLength(count + 1);
    expect(current.close).toHaveBeenCalledOnce();
  }
  const current = Source.instances[Source.instances.length - 1]!;
  current.dispatchEvent(new Event("open"));
  current.fail();
  await vi.advanceTimersByTimeAsync(1000);
  expect(Source.instances).toHaveLength(8);
});

it("cancels reconnect timers and removes listeners on disposal", async () => {
  start();
  const source = Source.instances[0]!;
  source.fail();
  stop!();
  source.dispatchEvent(new Event("open"));
  source.dispatchEvent(event({ id: "late", status: "resolved" }));
  await vi.advanceTimersByTimeAsync(30000);
  expect(Source.instances).toHaveLength(1);
  expect(fetcher).not.toHaveBeenCalled();
  expect(onStatus).not.toHaveBeenCalled();
});

it("aborts disposal requests and ignores a late response from the old session", async () => {
  let finish!: (value: unknown) => void;
  let signal!: AbortSignal;
  fetcher.mockImplementation((_url, options) => {
    signal = options.signal;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  start();
  Source.instances[0]!.dispatchEvent(new Event("open"));
  stop!();
  expect(signal.aborted).toBe(true);
  finish(snapshot([{ id: "old", status: "resolved" }]));
  await vi.advanceTimersByTimeAsync(0);
  expect(onStatus).not.toHaveBeenCalled();
});

it("keeps local feedback through HTTP failures and malformed events, then recovers", async () => {
  fetcher
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    .mockResolvedValue(snapshot([{ id: "done", status: "resolved" }]));
  start();
  Source.instances[0]!.dispatchEvent(new MessageEvent("annotation.updated", { data: "not json" }));
  await vi.advanceTimersByTimeAsync(20000);
  expect(onStatus).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(10000);
  expect(onStatus).toHaveBeenCalledOnce();
});
