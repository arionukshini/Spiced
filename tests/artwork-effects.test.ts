import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FeatureManager } from "../src/core/feature-manager";
import { SettingsStore, SETTINGS_KEY } from "../src/core/settings-store";
import { StyleRegistry } from "../src/core/style-registry";
import { spinningCD } from "../src/features/spinning-cd";
import { circularShadowFix } from "../src/features/circular-shadow-fix";
import { createSettings } from "../src/ui/settings";

const instances: FeatureManager[] = [];
const fixture = '<button data-testid="cover-art-button" style="box-shadow:0 0 8px black"><img></button><div class="main-nowPlayingView-coverArtContainer" data-testid="cover-art-slot" style="box-shadow:0 0 8px black"><div class="main-nowPlayingView-coverArtVisualEnhancement"><img></div></div><img id="unrelated">';
function setup(data = new Map<string, string>(), available = true) {
  let playing = false;
  const events = new EventTarget();
  const player = { isPlaying: () => playing, addEventListener: vi.fn((type: string, cb: () => void) => events.addEventListener(type, cb)), removeEventListener: vi.fn((type: string, cb: () => void) => events.removeEventListener(type, cb)) };
  const store = new SettingsStore({ get: key => data.get(key) ?? null, set: (key, value) => { data.set(key, value); } });
  const manager = new FeatureManager([spinningCD, circularShadowFix], { document, spicetify: available ? { Player: player } : {} }, store, new StyleRegistry(document));
  instances.push(manager);
  return { manager, data, player, store, play: (value: boolean) => { playing = value; events.dispatchEvent(new Event("onplaypause")); } };
}
beforeEach(() => { document.body.innerHTML = fixture; vi.spyOn(window.CSS, "supports").mockReturnValue(true); });
afterEach(async () => { for (const manager of instances.splice(0)) await manager.dispose(); document.body.replaceChildren(); document.head.replaceChildren(); vi.restoreAllMocks(); });
it("updates playback without polling and releases its exact listener and styles on disable", async () => {
  const { manager, player, play } = setup();
  await manager.start();
  await manager.setEnabled("spinning-cd", true);
  expect(document.documentElement.getAttribute("data-spiced-cd-playing")).toBe("false");
  play(true);
  expect(document.documentElement.getAttribute("data-spiced-cd-playing")).toBe("true");
  play(false);
  expect(document.documentElement.getAttribute("data-spiced-cd-playing")).toBe("false");
  expect(player.addEventListener).toHaveBeenCalledTimes(2);
  await manager.setEnabled("spinning-cd", false);
  for (const call of player.addEventListener.mock.calls) expect(player.removeEventListener).toHaveBeenCalledWith(...call);
  expect(document.documentElement.hasAttribute("data-spiced-cd-playing")).toBe(false);
  expect(document.querySelector('[data-spiced-style="feature:spinning-cd"]')).toBeNull();
  play(true);
  expect(document.documentElement.hasAttribute("data-spiced-cd-playing")).toBe(false);
});
it("persists speed without enabling, validates choices, and reapplies one stylesheet with the new duration", async () => {
  const { manager, data } = setup();
  await manager.start();
  await manager.setChoice("spinning-cd", "speed", "fast");
  expect(document.querySelector('[data-spiced-style="feature:spinning-cd"]')).toBeNull();
  expect(() => manager.setChoice("spinning-cd", "speed", "arbitrary-css")).toThrow();
  await manager.setEnabled("spinning-cd", true);
  expect(getComputedStyle(document.documentElement).getPropertyValue("--spiced-cd-duration").trim()).toBe("10s");
  await manager.setChoice("spinning-cd", "speed", "gentle");
  expect(getComputedStyle(document.documentElement).getPropertyValue("--spiced-cd-duration").trim()).toBe("360s");
  expect(document.querySelectorAll('[data-spiced-style="feature:spinning-cd"]')).toHaveLength(1);
  await manager.dispose();
  const next = setup(data);
  await next.manager.start();
  expect(next.manager.getSnapshot()[0]).toMatchObject({ enabled: true, choices: [{ value: "gentle" }] });
  expect(JSON.parse(data.get(SETTINGS_KEY)!).choices["spinning-cd.speed"]).toBe("gentle");
});
it("falls back from invalid stored speeds and preserves old boolean preferences", async () => {
  const data = new Map([[SETTINGS_KEY, JSON.stringify({ version: 1, features: { "future-feature": true }, choices: { "spinning-cd.speed": "invalid" } })]]);
  const { manager, store } = setup(data);
  await manager.start();
  expect(manager.getSnapshot()[0]?.choices?.[0]?.value).toBe("normal");
  await manager.setChoice("spinning-cd", "speed", "slow");
  expect(store.get("future-feature", false)).toBe(true);
});
it("reports missing playback APIs without breaking the independent shadow fix", async () => {
  const { manager } = setup(undefined, false);
  await manager.start();
  await manager.setEnabled("spinning-cd", true);
  await manager.setEnabled("circular-shadow-fix", true);
  expect(manager.getSnapshot().map(item => item.status)).toEqual(["unsupported", "enabled"]);
  expect(getComputedStyle(document.querySelector('[data-testid="cover-art-slot"]')!).boxShadow).toBe("none");
  await manager.setEnabled("circular-shadow-fix", false);
  expect(getComputedStyle(document.querySelector('[data-testid="cover-art-slot"]')!).boxShadow).not.toBe("none");
});
it("exposes an accessible speed select and retains its focus through live updates", async () => {
  const { manager, store } = setup();
  await manager.start();
  const view = createSettings(manager, () => store.getStatus());
  document.body.append(view);
  const select = view.querySelector("select")!;
  expect(document.getElementById(select.getAttribute("aria-labelledby")!)?.textContent).toBe("Rotation speed");
  select.focus(); select.value = "slow"; select.dispatchEvent(new Event("change"));
  await Promise.resolve();
  expect(manager.getSnapshot()[0]?.choices?.[0]?.value).toBe("slow");
  expect(document.activeElement).toBe(select);
  expect(view.querySelector("select")).toBe(select);
});

it("supports the Now Playing class when Spotify strips testing attributes", async () => {
  const panel = document.querySelector('[data-testid="cover-art-slot"]')!;
  panel.removeAttribute("data-testid");
  const { manager } = setup();
  await manager.start();
  await manager.setEnabled("circular-shadow-fix", true);
  await manager.setEnabled("spinning-cd", true);
  expect(getComputedStyle(panel).boxShadow).toBe("none");
  expect(getComputedStyle(panel).borderRadius).toBe("50%");
});

it("starts safely before playback state exists and recovers on a player event", async () => {
  const { manager, player, play } = setup();
  let ready = false;
  player.isPlaying = () => { if (!ready) throw new Error("State not ready"); return true; };
  await manager.start();
  await manager.setEnabled("spinning-cd", true);
  expect(manager.getSnapshot()[0]?.status).toBe("enabled");
  expect(document.documentElement.getAttribute("data-spiced-cd-playing")).toBe("false");
  ready = true;
  play(true);
  expect(document.documentElement.getAttribute("data-spiced-cd-playing")).toBe("true");
});
