import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../runtime-api.js";
import { msteamsPlugin } from "./channel.js";

describe("Microsoft Teams security audit", () => {
  it("exposes open DM policy to the shared security audit", () => {
    const cfg = {
      channels: {
        msteams: {
          dmPolicy: "open",
          allowFrom: ["*"],
        },
      },
    } satisfies OpenClawConfig;

    expect(
      msteamsPlugin.security?.resolveDmPolicy?.({
        cfg,
        account: msteamsPlugin.config.resolveAccount(cfg, undefined),
      }),
    ).toMatchObject({
      policy: "open",
      allowFrom: ["*"],
      policyPath: "channels.msteams.dmPolicy",
      allowFromPath: "channels.msteams.allowFrom",
    });
  });
});
