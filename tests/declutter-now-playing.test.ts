import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FeatureManager } from "../src/core/feature-manager";
import { SettingsStore } from "../src/core/settings-store";
import { StyleRegistry } from "../src/core/style-registry";
import { declutterNowPlaying } from "../src/features/declutter-now-playing";

const fixture = `<aside id="Desktop_PanelContainer_Id">
  <img id="artwork"><div id="track">Song and artist</div>
  <section id="credits"><div class="main-nowPlayingView-credits"><h2 class="main-nowPlayingView-creditsHeader">Credits</h2></div></section>
  <div id="artist" class="main-nowPlayingView-section main-nowPlayingView-aboutArtist">Biography</div>
  <div id="lyrics" class="main-nowPlayingView-section" data-testid="lyrics-npv-section">Lyrics</div>
  <section id="queue"><div class="main-nowPlayingView-queue">Next in queue</div></section>
  <div id="skeleton" data-testid="skeleton-section">Loading</div>
  <div id="plugin-lyrics" class="lyrics-npv-card">Extension lyrics</div><div id="SpicyLyricsNPVCard">Current Spicy Lyrics card</div>
  <div id="plugin-loading" class="LoadingLyricsCard">Loading extension lyrics</div>
  <div id="videos" class="main-nowPlayingView-section l5YdKPM8Ayc0mg7Zy6Gg"><div aria-label="Related music videos">Videos</div></div>
  <div id="tour" class="main-nowPlayingView-section nhcTY9t3aA49TPoP8ok4">On tour</div>
  <div id="other-card">Other content</div>
</aside><main><div id="outside" class="main-nowPlayingView-credits Loading LoadingLyricsCard">Unrelated content</div><div id="outside-tour" class="main-nowPlayingView-section nhcTY9t3aA49TPoP8ok4">Other tour list</div><button id="play">Play</button></main>`;
const managers: FeatureManager[] = [];
const supports = vi.fn(() => true);
function setup(data = new Map<string, string>()) {
  const manager = new FeatureManager([declutterNowPlaying], { document, spicetify: {} }, new SettingsStore({ get: key => data.get(key) ?? null, set: (key,value) => { data.set(key,value); } }), new StyleRegistry(document));
  managers.push(manager);
  return { manager, data };
}
function hidden(id: string) { return getComputedStyle(document.getElementById(id)!).display === "none"; }
function styles() { return document.querySelectorAll('[data-spiced-style="feature:declutter-now-playing"]'); }
beforeEach(() => { document.body.innerHTML = fixture; supports.mockReturnValue(true); vi.spyOn(window, "CSS", "get").mockReturnValue(Object.assign(window.CSS, { supports })); });
afterEach(async () => { for (const manager of managers.splice(0)) await manager.dispose(); document.head.replaceChildren(); document.body.replaceChildren(); vi.restoreAllMocks(); });
it("starts off and hides only the selected default cards when enabled", async () => {
  const markup = document.body.innerHTML;
  const { manager } = setup(); await manager.start();
  expect(styles()).toHaveLength(0);
  await manager.setEnabled("declutter-now-playing", true);
  for (const id of ["credits", "artist", "videos", "tour", "skeleton", "plugin-loading"]) expect(hidden(id), id).toBe(true);
  for (const id of ["lyrics", "plugin-lyrics", "SpicyLyricsNPVCard", "queue", "artwork", "track", "outside", "outside-tour", "play", "other-card"]) expect(hidden(id), id).toBe(false);
  expect(document.body.innerHTML).toBe(markup);
});
it("switches each card independently and removes the whole queue/credits wrapper", async () => {
  const { manager } = setup(); await manager.start(); await manager.setEnabled("declutter-now-playing", true);
  await manager.setOption("declutter-now-playing", "credits", false);
  expect(hidden("credits")).toBe(false); expect(hidden("artist")).toBe(true);
  await manager.setOption("declutter-now-playing", "queue", true);
  expect(hidden("queue")).toBe(true); expect(hidden("lyrics")).toBe(false);
  await manager.setOption("declutter-now-playing", "lyrics", true);
  expect(hidden("lyrics")).toBe(true); expect(hidden("plugin-lyrics")).toBe(true); expect(hidden("SpicyLyricsNPVCard")).toBe(true);
  await manager.setOption("declutter-now-playing", "loading", false);
  expect(hidden("skeleton")).toBe(false);
  expect(hidden("plugin-loading")).toBe(true);
  await manager.setOption("declutter-now-playing", "lyrics", false);
  expect(hidden("plugin-loading")).toBe(false);
  expect(styles()).toHaveLength(1);
});
it("cleans up immediately, preserves foreign styles and restores saved choices", async () => {
  const foreign = document.createElement("style"); foreign.textContent = "#track { color: orange }"; document.head.append(foreign);
  const { manager, data } = setup(); await manager.start();
  await manager.setOption("declutter-now-playing", "credits", false);
  await manager.setOption("declutter-now-playing", "queue", true);
  await manager.setEnabled("declutter-now-playing", true);
  const disabling = manager.setEnabled("declutter-now-playing", false);
  expect(styles()).toHaveLength(0); expect(hidden("queue")).toBe(false); expect(foreign.isConnected).toBe(true);
  await disabling; await manager.dispose();
  const next = setup(data); await next.manager.start();
  expect(styles()).toHaveLength(0);
  await next.manager.setEnabled("declutter-now-playing", true);
  expect(hidden("credits")).toBe(false); expect(hidden("queue")).toBe(true);
});
it("naturally applies when cards appear later without a DOM observer", async () => {
  document.body.replaceChildren(); const { manager } = setup(); await manager.start(); await manager.setEnabled("declutter-now-playing", true);
  document.body.innerHTML = fixture;
  expect(hidden("credits")).toBe(true); expect(hidden("outside")).toBe(false);
});
it("injects nothing with all choices off", async () => {
  const { manager } = setup(); await manager.start();
  for (const option of declutterNowPlaying.options!) await manager.setOption("declutter-now-playing", option.id, false);
  await manager.setEnabled("declutter-now-playing", true);
  expect(styles()).toHaveLength(0); expect(hidden("credits")).toBe(false);
});
it("fails gracefully when selector capabilities are absent", async () => {
  supports.mockReturnValue(false);
  const { manager } = setup(); await manager.start(); await manager.setEnabled("declutter-now-playing", true);
  expect(manager.getSnapshot()[0]?.status).toBe("unsupported"); expect(styles()).toHaveLength(0);
});

it("toggles related videos and tour cards independently and restores their saved choices", async () => {
  const { manager, data } = setup(); await manager.start(); await manager.setEnabled("declutter-now-playing", true);
  expect(hidden("videos")).toBe(true); expect(hidden("tour")).toBe(true); expect(hidden("outside-tour")).toBe(false);
  await manager.setOption("declutter-now-playing", "videos", false);
  expect(hidden("videos")).toBe(false); expect(hidden("tour")).toBe(true);
  await manager.setOption("declutter-now-playing", "tour", false);
  expect(hidden("tour")).toBe(false); expect(hidden("credits")).toBe(true);
  await manager.dispose(); const next = setup(data); await next.manager.start();
  expect(hidden("videos")).toBe(false); expect(hidden("tour")).toBe(false); expect(hidden("credits")).toBe(true);
  await next.manager.setOption("declutter-now-playing", "videos", true);
  document.querySelector("#videos")!.classList.remove("l5YdKPM8Ayc0mg7Zy6Gg");
  expect(hidden("videos")).toBe(true);
  await next.manager.setEnabled("declutter-now-playing", false);
  expect(hidden("videos")).toBe(false); expect(styles()).toHaveLength(0);
});
