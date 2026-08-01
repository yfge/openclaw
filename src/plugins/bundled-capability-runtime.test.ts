// Verifies bundled capability runtime registration from plugin metadata.
import { describe, expect, it } from "vitest";
import { loadBundledCapabilityRuntimeRegistry } from "./bundled-capability-runtime.js";

describe("loadBundledCapabilityRuntimeRegistry", () => {
  it("preserves manifest tool contracts on bundled plugin records", () => {
    const registry = loadBundledCapabilityRuntimeRegistry({
      pluginIds: ["memory-core"],
      env: { ...process.env, VITEST: "1" },
      pluginSdkResolution: "dist",
    });

    const plugin = registry.plugins.find((entry) => entry.id === "memory-core");
    expect(plugin?.contracts?.tools).toEqual(["intent", "memory_get", "memory_search"]);
    expect(
      registry.diagnostics.filter((entry) =>
        entry.message.includes("plugin must declare contracts.tools"),
      ),
    ).toEqual([]);
  });
});
