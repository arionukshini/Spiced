import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureManager } from "../src/core/feature-manager";
import { SettingsStore, SETTINGS_KEY } from "../src/core/settings-store";
import { StyleRegistry } from "../src/core/style-registry";
import { snappyControls } from "../src/features/snappy-controls";

const instances: { manager: FeatureManager; styles: StyleRegistry }[] = [];
const supports = vi.fn((_property: string, _value?: string) => true);
let originalRootStyle: string | null;

function storage() {
  const data = new Map<string, string>();
  return {
    data,
    get: (key: string) => data.get(key) ?? null,
    set: (key: string, value: string) => { data.set(key, value); },
  };
}

function setup(backend = storage()) {
  const styles = new StyleRegistry(document);
  const manager = new FeatureManager([snappyControls], { document, spicetify: {} }, new SettingsStore(backend), styles);
  instances.push({ manager, styles });
  return { manager, backend };
}

function featureStyles() {
  return document.querySelectorAll<HTMLStyleElement>('[data-spiced-style="feature:snappy-controls"]');
}

beforeEach(() => {
  originalRootStyle = document.documentElement.getAttribute("style");
  document.documentElement.style.setProperty("--encore-shortest-3", "150ms");
  supports.mockReturnValue(true);
  const css = Object.assign(window.CSS, { supports });
  vi.spyOn(window, "CSS", "get").mockReturnValue(css);
});

afterEach(async () => {
  for (const { manager, styles } of instances.splice(0)) {
    await manager.dispose();
    styles.dispose();
  }
  vi.restoreAllMocks();
  if (originalRootStyle === null) document.documentElement.removeAttribute("style");
  else document.documentElement.setAttribute("style", originalRootStyle);
});

describe("snappier controls feature", () => {
  it("starts enabled on a compatible client without rewriting its native timing token", async () => {
    const { manager } = setup();
    await manager.start();
    expect(manager.getSnapshot()[0]).toMatchObject({ enabled: true, status: "enabled" });
    expect(window.CSS.supports).toHaveBeenCalledWith("transition-duration", "min(75ms, 150ms)");
    expect(featureStyles()).toHaveLength(1);
    expect(featureStyles()[0]?.textContent).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(document.documentElement.style.getPropertyValue("--encore-shortest-3")).toBe("150ms");
    await manager.dispose();
    expect(featureStyles()).toHaveLength(0);
    expect(document.documentElement.style.getPropertyValue("--encore-shortest-3")).toBe("150ms");
  });

  it("removes its stylesheet immediately on disable and restores the saved choice after restart", async () => {
    const { manager, backend } = setup();
    await manager.start();
    expect(featureStyles()).toHaveLength(1);
    const disabling = manager.setEnabled("snappy-controls", false);
    expect(featureStyles()).toHaveLength(0);
    await disabling;
    expect(JSON.parse(backend.get(SETTINGS_KEY)!).features["snappy-controls"]).toBe(false);
    await manager.dispose();

    const next = setup(backend);
    await next.manager.start();
    expect(next.manager.getSnapshot()[0]).toMatchObject({ enabled: false, status: "disabled" });
    expect(featureStyles()).toHaveLength(0);
    await next.manager.setEnabled("snappy-controls", true);
    expect(next.manager.getSnapshot()[0]?.status).toBe("enabled");
    expect(featureStyles()).toHaveLength(1);
    await next.manager.setEnabled("snappy-controls", true);
    expect(featureStyles()).toHaveLength(1);
    await next.manager.dispose();

    const restored = setup(backend);
    await restored.manager.start();
    expect(restored.manager.getSnapshot()[0]).toMatchObject({ enabled: true, status: "enabled" });
    expect(featureStyles()).toHaveLength(1);
  });

  it("reports a missing Encore token without activating or changing the desired choice", async () => {
    document.documentElement.style.removeProperty("--encore-shortest-3");
    const activate = vi.spyOn(snappyControls, "activate");
    const { manager } = setup();
    await manager.start();
    expect(manager.getSnapshot()[0]).toMatchObject({ enabled: true, status: "unsupported" });
    expect(manager.getSnapshot()[0]?.message).toContain("Encore timing token");
    expect(activate).not.toHaveBeenCalled();
    expect(featureStyles()).toHaveLength(0);
  });

  it("reports unsupported timing values without activating", async () => {
    vi.mocked(window.CSS.supports).mockReturnValue(false);
    const activate = vi.spyOn(snappyControls, "activate");
    const { manager } = setup();
    await manager.start();
    expect(manager.getSnapshot()[0]?.status).toBe("unsupported");
    expect(manager.getSnapshot()[0]?.message).toContain("CSS timing values");
    expect(activate).not.toHaveBeenCalled();
    expect(featureStyles()).toHaveLength(0);
  });

  it("handles a missing CSS.supports method as unsupported instead of an activation error", async () => {
    Object.defineProperty(window.CSS, "supports", { configurable: true, value: undefined });
    const activate = vi.spyOn(snappyControls, "activate");
    const { manager } = setup();
    await manager.start();
    expect(manager.getSnapshot()[0]?.status).toBe("unsupported");
    expect(manager.getSnapshot()[0]?.message).toContain("CSS timing values");
    expect(activate).not.toHaveBeenCalled();
    expect(featureStyles()).toHaveLength(0);
  });
});
