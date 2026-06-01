import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import { describe, expect, it } from "vitest";
import setupEntry from "./setup-api.js";

describe("xai setup entry", () => {
  it("registers the setup Grok CLI backend", () => {
    const cliBackendIds: string[] = [];

    setupEntry.register({
      registerAutoEnableProbe() {},
      registerCliBackend(backend: CliBackendPlugin) {
        cliBackendIds.push(backend.id);
      },
    } as never);

    expect(cliBackendIds).toEqual(["grok-cli"]);
  });
});
