import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureManager } from "../src/core/feature-manager";
import { SettingsStore, SETTINGS_KEY } from "../src/core/settings-store";
import { StyleRegistry } from "../src/core/style-registry";
import type { FeatureDefinition } from "../src/core/types";

function storage() {
  const data = new Map<string, string>();
  return { data, get: (key: string) => data.get(key) ?? null, set: (key: string, value: string) => { data.set(key, value); } };
}

function feature(overrides: Partial<FeatureDefinition> = {}): FeatureDefinition {
  return { id: "test", name: "Test", description: "Test feature", category: "appearance", defaultEnabled: false,
    activate: ({ addStyle }) => { addStyle(".test { color: orange }"); }, ...overrides };
}

function setup(definitions = [feature()], backend = storage()) {
  const store = new SettingsStore(backend);
  const styles = new StyleRegistry(document);
  const manager = new FeatureManager(definitions, { document, spicetify: {} }, store, styles);
  return { store, styles, manager, backend };
}

afterEach(() => { document.head.innerHTML = ""; document.body.innerHTML = ""; });

describe("persistent preferences", () => {
  it("restores booleans and retains unknown features for future registry changes", () => {
    const backend = storage();
    backend.set(SETTINGS_KEY, JSON.stringify({ version: 1, features: { future: true, invalid: "true" } }));
    const store = new SettingsStore(backend);
    expect(store.get("invalid", false)).toBe(false);
    store.set("test", true);
    const restored = new SettingsStore(backend);
    expect(restored.get("test", false)).toBe(true);
    expect(restored.get("future", false)).toBe(true);
  });

  it("survives corrupt settings, unavailable storage and write failures", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const backend = storage();
    backend.set(SETTINGS_KEY, "bad json");
    const store = new SettingsStore(backend);
    expect(store.getStatus().saved).toBe(false);
    store.set("test", true);
    expect(store.getStatus().saved).toBe(true);
    const unavailable = new SettingsStore({ get: () => null, set: () => { throw new Error("full"); } });
    unavailable.set("test", true);
    expect(unavailable.get("test", false)).toBe(true);
    expect(unavailable.getStatus().saved).toBe(false);
    expect(new SettingsStore().getStatus().saved).toBe(false);
  });

  it("does not overwrite an unrecognized schema version", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const backend = storage();
    const raw = JSON.stringify({ version: 2, features: { future: true } });
    backend.set(SETTINGS_KEY, raw);
    const store = new SettingsStore(backend);
    store.set("test", true);
    expect(backend.get(SETTINGS_KEY)).toBe(raw);
    expect(store.getStatus().saved).toBe(false);
  });
});

describe("feature lifecycle", () => {
  it("toggles immediately, deduplicates styles and restores enabled features after restart", async () => {
    const { manager, backend } = setup();
    await manager.start();
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    await manager.setEnabled("test", true);
    await manager.setEnabled("test", true);
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(1);
    await manager.setEnabled("test", false);
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    await manager.setEnabled("test", true);
    await manager.dispose();
    const next = setup([feature()], backend);
    await next.manager.start();
    expect(next.manager.getSnapshot()[0]?.status).toBe("enabled");
    await next.manager.dispose();
  });

  it("old style cleanups cannot remove newer styles or another extension’s styles", () => {
    const { styles } = setup();
    const foreign = document.createElement("style");
    document.head.append(foreign);
    const stale = styles.inject("test", "a {}");
    const current = styles.inject("test", "b {}");
    stale();
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(1);
    current();
    styles.dispose();
    expect(foreign.isConnected).toBe(true);
  });

  it("isolates partial activation failures and continues all cleanups after one throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cleanup = vi.fn();
    const broken = feature({ id: "broken", defaultEnabled: true, activate: context => {
      context.addStyle("a {}");
      context.onCleanup(cleanup);
      context.onCleanup(() => { throw new Error("cleanup failed"); });
      throw new Error("initialization failed");
    } });
    const { manager } = setup([broken, feature({ defaultEnabled: true })]);
    await manager.start();
    expect(manager.getSnapshot().map(item => item.status)).toEqual(["error", "enabled"]);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(1);
    await manager.dispose();
  });

  it("checks compatibility without activation and can recheck", async () => {
    let supported = false;
    const activate = vi.fn();
    const { manager } = setup([feature({ activate, defaultEnabled: true, checkSupport: () => supported
      ? { supported: true } : { supported: false, reason: "Target is unavailable" } })]);
    await manager.start();
    expect(manager.getSnapshot()[0]?.message).toBe("Target is unavailable");
    expect(activate).not.toHaveBeenCalled();
    supported = true;
    await manager.retry("test");
    expect(manager.getSnapshot()[0]?.status).toBe("enabled");
    await manager.dispose();
  });

  it("cancels a pending initialization and cleans resources registered after cancellation", async () => {
    let finish!: () => void;
    const cleanup = vi.fn();
    const { manager } = setup([feature({ activate: async context => {
      context.addStyle("a {}");
      await new Promise<void>(resolve => { finish = resolve; });
      context.onCleanup(cleanup);
    } })]);
    await manager.start();
    const enabling = manager.setEnabled("test", true);
    await Promise.resolve();
    const disabling = manager.setEnabled("test", false);
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    finish();
    await Promise.all([enabling, disabling]);
    expect(manager.getSnapshot()[0]?.status).toBe("disabled");
    expect(cleanup).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    await manager.dispose();
  });

  it("handles rapid toggles and removes listeners on disable", async () => {
    const listener = vi.fn();
    const { manager } = setup([feature({ activate: ({ listen }) => { listen(document, "demo", listener); } })]);
    await manager.start();
    await Promise.all([manager.setEnabled("test", true), manager.setEnabled("test", false), manager.setEnabled("test", true)]);
    document.dispatchEvent(new Event("demo"));
    expect(listener).toHaveBeenCalledOnce();
    await manager.setEnabled("test", false);
    document.dispatchEvent(new Event("demo"));
    expect(listener).toHaveBeenCalledOnce();
    await manager.dispose();
  });

  it("allows disable and disposal even if asynchronous work never settles", async () => {
    const { manager } = setup([feature({ activate: async ({ addStyle }) => {
      addStyle("a {}");
      await new Promise<void>(() => {});
    } })]);
    await manager.start();
    const enabling = manager.setEnabled("test", true);
    await Promise.resolve();
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(1);
    await manager.setEnabled("test", false);
    await enabling;
    expect(manager.getSnapshot()[0]?.status).toBe("disabled");
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    const first = manager.dispose();
    expect(manager.dispose()).toBe(first);
    await first;
  });

  it("ignores style writes from cancelled work after a new activation", async () => {
    let finish!: () => void;
    let calls = 0;
    const lateCleanup = vi.fn();
    const { manager } = setup([feature({ activate: async context => {
      if (++calls === 1) {
        await new Promise<void>(resolve => { finish = resolve; });
        context.addStyle(".stale {}");
        return lateCleanup;
      }
      context.addStyle(".current {}");
    } })]);
    await manager.start();
    const first = manager.setEnabled("test", true);
    await Promise.resolve();
    await manager.setEnabled("test", false);
    await first;
    await manager.setEnabled("test", true);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('[data-spiced-style="feature:test"]')?.textContent).toBe(".current {}");
    expect(lateCleanup).toHaveBeenCalledOnce();
    await manager.dispose();
  });

  it("contains event handler errors and removes that feature’s resources", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { manager } = setup([feature({ defaultEnabled: true, activate: ({ addStyle, listen }) => {
      addStyle("a {}");
      listen(document, "demo", async () => { throw new Error("handler failed"); });
    } })]);
    await manager.start();
    document.dispatchEvent(new Event("demo"));
    await Promise.resolve();
    expect(manager.getSnapshot()[0]?.status).toBe("error");
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    await manager.dispose();
  });
});
