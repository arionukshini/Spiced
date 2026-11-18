import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureManager } from "../src/core/feature-manager";
import { SettingsStore, SETTINGS_KEY } from "../src/core/settings-store";
import { StyleRegistry } from "../src/core/style-registry";
import { orangeDemo } from "../src/features/orange-demo";
import { roundAlbumCovers } from "../src/features/round-album-covers";

const instances: { manager: FeatureManager; styles: StyleRegistry }[] = [];
const supports = vi.fn((_property: string, _value?: string) => true);
let originalHead: HTMLHeadElement;
let originalBody: string;

function storage() {
  const data = new Map<string, string>();
  return {
    get: (key: string) => data.get(key) ?? null,
    set: (key: string, value: string) => { data.set(key, value); },
  };
}

function setup(backend = storage()) {
  const styles = new StyleRegistry(document);
  const manager = new FeatureManager([roundAlbumCovers, orangeDemo], { document, spicetify: {} }, new SettingsStore(backend), styles);
  instances.push({ manager, styles });
  return { manager, backend };
}

function coverStyles() {
  return document.querySelectorAll<HTMLStyleElement>('[data-spiced-style="feature:round-album-covers"]');
}

beforeEach(() => {
  originalHead = document.head;
  originalBody = document.body.innerHTML;
  supports.mockReturnValue(true);
  vi.spyOn(window, "CSS", "get").mockReturnValue(Object.assign(window.CSS, { supports }));
  document.body.innerHTML = '<main><img class="main-cardImage-image" alt="Album artwork" width="100" height="100"></main>';
});

afterEach(async () => {
  for (const { manager, styles } of instances.splice(0)) {
    await manager.dispose();
    styles.dispose();
  }
  if (!originalHead.isConnected) document.documentElement.prepend(originalHead);
  document.body.innerHTML = originalBody;
  vi.restoreAllMocks();
});

describe("round album covers feature", () => {
  it("starts enabled, owns one stylesheet and rounds artwork without modifying its markup", async () => {
    const markup = document.body.innerHTML;
    const { manager } = setup();
    await manager.start();
    expect(manager.getSnapshot().find(item => item.definition.id === "round-album-covers"))
      .toMatchObject({ enabled: true, status: "enabled" });
    expect(coverStyles()).toHaveLength(1);
    expect(window.CSS.supports).toHaveBeenCalledWith("border-radius", "50%");
    expect(getComputedStyle(document.querySelector("img")!).borderRadius).toBe("10px");
    expect(document.body.innerHTML).toBe(markup);
    await manager.setEnabled("round-album-covers", true);
    expect(coverStyles()).toHaveLength(1);
    await manager.dispose();
    expect(coverStyles()).toHaveLength(0);
    expect(document.body.innerHTML).toBe(markup);
  });

  it("removes its CSS immediately on disable while leaving another feature's stylesheet active", async () => {
    const { manager } = setup();
    await manager.start();
    await manager.setEnabled("orange-demo", true);
    const otherStyle = document.querySelector('[data-spiced-style="feature:orange-demo"]');
    expect(otherStyle).not.toBeNull();
    expect(coverStyles()).toHaveLength(1);
    const disabling = manager.setEnabled("round-album-covers", false);
    expect(coverStyles()).toHaveLength(0);
    expect(otherStyle?.isConnected).toBe(true);
    await disabling;
    expect(manager.getSnapshot().find(item => item.definition.id === "orange-demo")?.status).toBe("enabled");
    expect(document.querySelector('[data-spiced-style="feature:orange-demo"]')).toBe(otherStyle);
    expect(getComputedStyle(document.querySelector("img")!).borderRadius).not.toBe("10px");
  });

  it("restores a saved disabled choice rather than reapplying the default after restart", async () => {
    const { manager, backend } = setup();
    await manager.start();
    await manager.setEnabled("round-album-covers", false);
    expect(JSON.parse(backend.get(SETTINGS_KEY)!).features["round-album-covers"]).toBe(false);
    await manager.dispose();
    const next = setup(backend);
    await next.manager.start();
    expect(next.manager.getSnapshot().find(item => item.definition.id === "round-album-covers"))
      .toMatchObject({ enabled: false, status: "disabled" });
    expect(coverStyles()).toHaveLength(0);
  });

  it("reports a missing document head without activating or mutating artwork", async () => {
    const markup = document.body.innerHTML;
    originalHead.remove();
    const activate = vi.spyOn(roundAlbumCovers, "activate");
    const { manager } = setup();
    await manager.start();
    expect(manager.getSnapshot().find(item => item.definition.id === "round-album-covers"))
      .toMatchObject({ enabled: true, status: "unsupported" });
    expect(activate).not.toHaveBeenCalled();
    expect(coverStyles()).toHaveLength(0);
    expect(document.body.innerHTML).toBe(markup);
  });

  it.each(["unsupported values", "missing supports method"])("handles CSS capability failure: %s", async failure => {
    const markup = document.body.innerHTML;
    if (failure === "unsupported values") supports.mockReturnValue(false);
    else Object.defineProperty(window.CSS, "supports", { configurable: true, value: undefined });
    const activate = vi.spyOn(roundAlbumCovers, "activate");
    const { manager } = setup();
    await manager.start();
    const result = manager.getSnapshot().find(item => item.definition.id === "round-album-covers");
    expect(result).toMatchObject({ enabled: true, status: "unsupported" });
    expect(result?.message).toBeTruthy();
    expect(activate).not.toHaveBeenCalled();
    expect(coverStyles()).toHaveLength(0);
    expect(document.body.innerHTML).toBe(markup);
  });
});
