// Feishu plugin module implements send target behavior.
import type { ClawdbotConfig } from "../runtime-api.js";
import { resolveFeishuRuntimeAccount } from "./accounts.js";
import { clearClientCache, createFeishuClient } from "./client.js";
import { resolveReceiveIdType, normalizeFeishuTarget } from "./targets.js";

export type FeishuSendTarget = {
  client: ReturnType<typeof createFeishuClient>;
  getClient: () => ReturnType<typeof createFeishuClient>;
  resetClient: () => void;
  receiveId: string;
  receiveIdType: ReturnType<typeof resolveReceiveIdType>;
};

export function resolveFeishuSendTarget(params: {
  cfg: ClawdbotConfig;
  to: string;
  accountId?: string;
}): FeishuSendTarget {
  const target = params.to.trim();
  const account = resolveFeishuRuntimeAccount({ cfg: params.cfg, accountId: params.accountId });
  if (!account.configured) {
    throw new Error(`Feishu account "${account.accountId}" not configured`);
  }
  const getClient = () => createFeishuClient(account);
  const resetClient = () => {
    clearClientCache(account.accountId);
  };
  const client = getClient();
  const receiveId = normalizeFeishuTarget(target);
  if (!receiveId) {
    throw new Error(`Invalid Feishu target: ${params.to}`);
  }
  // Preserve explicit routing prefixes (chat/group/user/dm/open_id) when present.
  // normalizeFeishuTarget strips these prefixes, so infer type from the raw target first.
  const withoutProviderPrefix = target.replace(/^(feishu|lark):/i, "");
  return {
    client,
    getClient,
    resetClient,
    receiveId,
    receiveIdType: resolveReceiveIdType(withoutProviderPrefix),
  };
}
