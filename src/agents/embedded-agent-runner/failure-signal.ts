/**
 * Converts embedded run failures into provider failover signals.
 */
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import { isExecLikeToolName, type ToolErrorSummary } from "../tool-error-summary.js";
import type { EmbeddedRunFailureSignal } from "./types.js";

/**
 * Converts terminal tool errors from unattended embedded runs into failure signals.
 *
 * Cron runs need fatal execution-denied signals so schedulers do not treat blocked shell access as
 * a normal silent completion.
 */
const FAILURE_SIGNAL_CODES = ["SYSTEM_RUN_DENIED", "INVALID_REQUEST"] as const;
type ExecutionDeniedFailureSignalCode = (typeof FAILURE_SIGNAL_CODES)[number];

function resolveFailureSignalCode(
  value: string | undefined,
): ExecutionDeniedFailureSignalCode | undefined {
  for (const code of FAILURE_SIGNAL_CODES) {
    if (value === code) {
      return code;
    }
  }
  return undefined;
}

/** Resolves fatal cron failure metadata from the last exec-like tool error, if applicable. */
export function resolveEmbeddedRunFailureSignal(params: {
  trigger?: string | undefined;
  lastToolError?: ToolErrorSummary | undefined;
  unavailableToolFailure?: { toolName: string; count: number; threshold: number } | undefined;
}): EmbeddedRunFailureSignal | undefined {
  if (params.trigger !== "cron") {
    return undefined;
  }
  const unavailableToolFailure = params.unavailableToolFailure;
  if (unavailableToolFailure) {
    return {
      kind: "unavailable_tool",
      source: "tool",
      toolName: unavailableToolFailure.toolName,
      code: "UNAVAILABLE_TOOL_EXHAUSTED",
      message:
        `Unavailable tool "${unavailableToolFailure.toolName}" was requested ` +
        `${unavailableToolFailure.count} times and exhausted the cron tool guard.`,
      fatalForCron: true,
    };
  }
  const lastToolError = params.lastToolError;
  if (!lastToolError || !isExecLikeToolName(lastToolError.toolName)) {
    return undefined;
  }
  const code = resolveFailureSignalCode(normalizeOptionalString(lastToolError.errorCode));
  if (!code) {
    return undefined;
  }
  const message = normalizeOptionalString(lastToolError.error) ?? code;
  return {
    kind: "execution_denied",
    source: "tool",
    ...(lastToolError.toolName ? { toolName: lastToolError.toolName } : {}),
    code,
    message,
    fatalForCron: true,
  };
}
