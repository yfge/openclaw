import { describe, expect, it, vi } from "vitest";
import {
  awaitPendingManagerWork,
  awaitStablePendingManagerWork,
  startAsyncSearchSync,
} from "./manager-async-state.js";

describe("memory search async sync", () => {
  function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it("does not await sync when searching", async () => {
    let releaseSync = () => {};
    const pending = new Promise<void>((resolve) => {
      releaseSync = () => resolve();
    });
    const syncMock = vi.fn(async () => {
      return pending;
    });
    const onError = vi.fn();

    startAsyncSearchSync({
      enabled: true,
      dirty: true,
      sessionsDirty: false,
      sync: syncMock,
      onError,
    });

    expect(syncMock).toHaveBeenCalledTimes(1);
    releaseSync();
    await pending;
    expect(onError).not.toHaveBeenCalled();
  });

  it("waits for in-flight search sync during close", async () => {
    let releaseSync = () => {};
    const pendingSync = new Promise<void>((resolve) => {
      releaseSync = () => resolve();
    });

    let closed = false;
    const closePromise = awaitPendingManagerWork({ pendingSync }).then(() => {
      closed = true;
    });

    await Promise.resolve();
    expect(closed).toBe(false);

    releaseSync();
    await closePromise;
  });

  it("waits for a sync that attaches after provider init settles", async () => {
    const providerInit = createDeferred<void>();
    const lateSync = createDeferred<void>();
    let pendingSync: Promise<void> | null = null;
    void providerInit.promise.then(() => {
      pendingSync = lateSync.promise.finally(() => {
        pendingSync = null;
      });
    });

    let closed = false;
    const closePromise = awaitStablePendingManagerWork({
      getPendingSync: () => pendingSync,
      getPendingProviderInit: () => providerInit.promise,
    }).then(() => {
      closed = true;
    });

    providerInit.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(closed).toBe(false);

    lateSync.resolve();
    await closePromise;
    expect(closed).toBe(true);
  });

  it("still finishes when provider init fails and no sync attaches", async () => {
    const providerInit = createDeferred<void>();
    const closePromise = awaitStablePendingManagerWork({
      getPendingSync: () => null,
      getPendingProviderInit: () => providerInit.promise,
    });

    providerInit.reject(new Error("provider init failed"));
    await expect(closePromise).resolves.toBeUndefined();
  });

  it("skips background search sync when search-triggered sync is disabled", () => {
    const syncMock = vi.fn(async () => {});
    startAsyncSearchSync({
      enabled: false,
      dirty: true,
      sessionsDirty: false,
      sync: syncMock,
      onError: vi.fn(),
    });
    expect(syncMock).not.toHaveBeenCalled();
  });
});
