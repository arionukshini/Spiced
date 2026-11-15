import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpicetifyAPI } from "../src/compatibility/spicetify";
import { SETTINGS_KEY } from "../src/core/settings-store";
import { bootstrap } from "../src/runtime";
import type { SpicedRuntime } from "../src/runtime";

const runtimes: SpicedRuntime[] = [];

function setup(withStorage = true) {
  const data = new Map<string, string>();
  const register = vi.fn();
  const deregister = vi.fn();
  let menu: { name: string; onClick: () => void } | undefined;
  const modal = document.createElement("div");
  document.body.append(modal);
  const api: SpicetifyAPI = {
    Menu: {
      Item: class {
        constructor(public name: string, _checked: boolean, public onClick: () => void) { menu = this; }
        register = register;
        deregister = deregister;
      },
    },
    PopupModal: {
      display: vi.fn(({ content }) => { modal.replaceChildren(content); }),
      hide: vi.fn(() => { modal.replaceChildren(); }),
    },
    showNotification: vi.fn(),
  };
  if (withStorage) api.LocalStorage = {
    get: key => data.get(key) ?? null,
    set: (key, value) => { data.set(key, value); },
  };
  vi.stubGlobal("Spicetify", api);
  const start = () => {
    const runtime = bootstrap();
    runtimes.push(runtime);
    return runtime;
  };
  return { api, data, modal, register, deregister, start, clickMenu: () => menu!.onClick(), getMenu: () => menu };
}

afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
  document.head.replaceChildren();
});

describe("Spotify runtime integration", () => {
  it("opens settings from the menu, toggles CSS immediately, and restores preferences after reboot", async () => {
    const harness = setup();
    const first = harness.start();
    expect(harness.register).toHaveBeenCalledOnce();
    expect(harness.getMenu()?.name).toBe("Spiced settings");
    harness.clickMenu();
    expect(harness.api.PopupModal!.display).toHaveBeenCalledWith(expect.objectContaining({ title: "Spiced", isLarge: true }));
    const input = harness.modal.querySelector("input")!;
    await vi.waitFor(() => expect(harness.modal.querySelector(".spiced-feature-status")?.textContent).toBe("Off"));
    expect(document.querySelector('[data-spiced-style="feature:orange-demo"]')).toBeNull();
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(document.querySelectorAll('[data-spiced-style="feature:orange-demo"]')).toHaveLength(1));
    expect(JSON.parse(harness.data.get(SETTINGS_KEY)!).features["orange-demo"]).toBe(true);
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(document.querySelector('[data-spiced-style="feature:orange-demo"]')).toBeNull());
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(harness.modal.querySelector(".spiced-feature-status")?.textContent).toBe("On"));
    await first.dispose();
    expect(harness.deregister).toHaveBeenCalledOnce();
    expect(harness.modal.childElementCount).toBe(0);
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    const second = harness.start();
    harness.clickMenu();
    await vi.waitFor(() => expect(harness.modal.querySelector(".spiced-feature-status")?.textContent).toBe("On"));
    expect(harness.modal.querySelector("input")?.checked).toBe(true);
    expect(document.querySelectorAll('[data-spiced-style="feature:orange-demo"]')).toHaveLength(1);
    second.openSettings();
    expect(harness.modal.querySelectorAll("spiced-settings")).toHaveLength(1);
    expect(document.querySelectorAll('[data-spiced-style="settings"]')).toHaveLength(1);
    await second.dispose();
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
  });

  it("opens and applies settings with a visible warning when persistent storage is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const harness = setup(false);
    harness.start().openSettings();
    const notice = harness.modal.querySelector<HTMLElement>(".spiced-persistence")!;
    expect(notice.dataset.saved).toBe("false");
    expect(notice.textContent).toContain("session-only");
    const input = harness.modal.querySelector("input")!;
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(document.querySelector('[data-spiced-style="feature:orange-demo"]')).not.toBeNull());
    expect(notice.dataset.saved).toBe("false");
  });

  it("waits for the documented APIs, stops after 30 seconds, and disposes pending startup cleanly", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Spicetify", undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runtime = bootstrap();
    runtimes.push(runtime);
    runtime.openSettings();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("[Spiced:"), expect.stringContaining("not ready"));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("[Spiced:"), expect.stringContaining("30 seconds"));
    expect(vi.getTimerCount()).toBe(0);
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    const pending = bootstrap();
    runtimes.push(pending);
    expect(vi.getTimerCount()).toBe(1);
    await pending.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("initializes when APIs arrive during the bounded startup window and cleans up on pagehide", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Spicetify", undefined);
    const runtime = bootstrap();
    runtimes.push(runtime);
    await vi.advanceTimersByTimeAsync(500);
    const harness = setup();
    await vi.advanceTimersByTimeAsync(250);
    expect(harness.register).toHaveBeenCalledOnce();
    runtime.openSettings();
    expect(harness.modal.querySelector("spiced-settings")).not.toBeNull();
    window.dispatchEvent(new Event("pagehide"));
    await Promise.resolve();
    expect(harness.deregister).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("[data-spiced-style]")).toHaveLength(0);
    expect(harness.modal.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
