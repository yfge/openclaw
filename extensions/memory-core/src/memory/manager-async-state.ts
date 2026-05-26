export function startAsyncSearchSync(params: {
  enabled: boolean;
  dirty: boolean;
  sessionsDirty: boolean;
  sync: (params: { reason: string }) => Promise<void>;
  onError: (err: unknown) => void;
}): void {
  if (!params.enabled || (!params.dirty && !params.sessionsDirty)) {
    return;
  }
  void params.sync({ reason: "search" }).catch((err) => {
    params.onError(err);
  });
}

export async function awaitPendingManagerWork(params: {
  pendingSync?: Promise<void> | null;
  pendingProviderInit?: Promise<void> | null;
}): Promise<void> {
  if (params.pendingSync) {
    try {
      await params.pendingSync;
    } catch {}
  }
  if (params.pendingProviderInit) {
    try {
      await params.pendingProviderInit;
    } catch {}
  }
}

export async function awaitStablePendingManagerWork(params: {
  getPendingSync: () => Promise<void> | null;
  getPendingProviderInit: () => Promise<void> | null;
}): Promise<void> {
  const pendingProviderInit = params.getPendingProviderInit();
  let pendingSync = params.getPendingSync();
  await awaitPendingManagerWork({ pendingSync, pendingProviderInit });
  while (params.getPendingSync() && params.getPendingSync() !== pendingSync) {
    pendingSync = params.getPendingSync();
    await awaitPendingManagerWork({ pendingSync });
  }
}
