import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import {
  CLI_FRESH_WATCHDOG_DEFAULTS,
  CLI_RESUME_WATCHDOG_DEFAULTS,
} from "openclaw/plugin-sdk/cli-backend";

const GROK_CLI_DEFAULT_MODEL_REF = "grok-cli/grok-build-0.1";
const GROK_CLI_MODEL_ALIASES: Record<string, string> = {
  build: "grok-build-0.1",
  fast: "grok-build-0.1",
};

export function buildXaiGrokCliBackend(): CliBackendPlugin {
  return {
    id: "grok-cli",
    modelProvider: "xai",
    liveTest: {
      defaultModelRef: GROK_CLI_DEFAULT_MODEL_REF,
      docker: {
        binaryName: "grok",
      },
    },
    nativeToolMode: "always-on",
    config: {
      command: "grok",
      args: [
        "--no-auto-update",
        "--no-alt-screen",
        "--always-approve",
        "--output-format",
        "json",
        "-p",
      ],
      resumeArgs: [
        "--no-auto-update",
        "--no-alt-screen",
        "--always-approve",
        "--output-format",
        "json",
        "-r",
        "{sessionId}",
        "-p",
      ],
      output: "json",
      input: "arg",
      modelArg: "-m",
      modelAliases: GROK_CLI_MODEL_ALIASES,
      sessionArg: "-s",
      sessionMode: "always",
      sessionIdFields: ["session_id", "sessionId", "session"],
      reliability: {
        watchdog: {
          fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
          resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
        },
      },
      serialize: true,
    },
  };
}
