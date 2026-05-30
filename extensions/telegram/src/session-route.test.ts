import { describe, expect, it } from "vitest";
import { telegramPlugin } from "./channel.js";

describe("telegram session route", () => {
  it("keeps direct topic thread ids in a thread session suffix", async () => {
    const route = await telegramPlugin.messaging?.resolveOutboundSessionRoute?.({
      cfg: {},
      agentId: "main",
      target: "12345:topic:99",
    });

    expect(route?.sessionKey).toBe("agent:main:main:thread:99");
    expect(route?.baseSessionKey).toBe("agent:main:main");
    expect(route?.threadId).toBe(99);
  });

  it("recovers direct topic thread routes from currentSessionKey when the DM scope is isolated", async () => {
    const route = await telegramPlugin.messaging?.resolveOutboundSessionRoute?.({
      cfg: { session: { dmScope: "per-channel-peer" } },
      agentId: "main",
      target: "12345",
      currentSessionKey: "agent:main:telegram:direct:12345:thread:12345:99",
    });

    expect(route?.sessionKey).toBe("agent:main:telegram:direct:12345:thread:12345:99");
    expect(route?.baseSessionKey).toBe("agent:main:telegram:direct:12345");
    expect(route?.threadId).toBe("12345:99");
  });

  it("aligns proactive direct topic routes with inbound DM topic session keys", async () => {
    const route = await telegramPlugin.messaging?.resolveOutboundSessionRoute?.({
      cfg: { session: { dmScope: "per-channel-peer" } },
      agentId: "main",
      target: "12345:topic:99",
    });

    expect(route?.sessionKey).toBe("agent:main:telegram:direct:12345:thread:12345:99");
    expect(route?.baseSessionKey).toBe("agent:main:telegram:direct:12345");
    expect(route?.threadId).toBe("12345:99");
    expect(route?.from).toBe("telegram:12345:topic:99");
  });

  it("aligns delivery thread ids with inbound DM topic session keys for account-scoped DMs", async () => {
    const route = await telegramPlugin.messaging?.resolveOutboundSessionRoute?.({
      cfg: { session: { dmScope: "per-account-channel-peer" } },
      agentId: "finance",
      accountId: "finance",
      target: "104506878",
      threadId: 174872,
    });

    expect(route?.sessionKey).toBe(
      "agent:finance:telegram:finance:direct:104506878:thread:104506878:174872",
    );
    expect(route?.baseSessionKey).toBe("agent:finance:telegram:finance:direct:104506878");
    expect(route?.threadId).toBe("104506878:174872");
    expect(route?.from).toBe("telegram:104506878:topic:174872");
  });

  it('does not recover currentSessionKey threads for shared dmScope "main" DMs', async () => {
    const route = await telegramPlugin.messaging?.resolveOutboundSessionRoute?.({
      cfg: {},
      agentId: "main",
      target: "12345",
      currentSessionKey: "agent:main:main:thread:12345:99",
    });

    expect(route?.sessionKey).toBe("agent:main:main");
    expect(route?.baseSessionKey).toBe("agent:main:main");
    expect(route?.threadId).toBeUndefined();
  });

  it("keeps group topic ids in the group peer route instead of adding a thread suffix", async () => {
    const route = await telegramPlugin.messaging?.resolveOutboundSessionRoute?.({
      cfg: {},
      agentId: "main",
      target: "-100:topic:99",
    });

    expect(route?.sessionKey).toBe("agent:main:telegram:group:-100:topic:99");
    expect(route?.baseSessionKey).toBe("agent:main:telegram:group:-100:topic:99");
    expect(route?.threadId).toBe(99);
  });
});
