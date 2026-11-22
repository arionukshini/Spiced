import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FeatureManager } from "../src/core/feature-manager";
import { SettingsStore } from "../src/core/settings-store";
import { StyleRegistry } from "../src/core/style-registry";
import { fullAlbumDate } from "../src/features/full-album-date";
import { formatReleaseDate, readAlbumDate } from "../src/features/full-album-date/release-date";

const first = "a".repeat(22);
const second = "b".repeat(22);
const managers: FeatureManager[] = [];
function metadata(id = first, isoString = "2026-10-13T00:00:00Z", precision = "DAY") {
  return { data: { albumUnion: { __typename: "Album", uri: `spotify:album:${id}`, date: { isoString, precision } } } };
}
function header(year = "2026") {
  document.body.innerHTML = `<main class="main-view-container"><section data-testid="album-page"><span data-testid="release-date">${year}</span></section></main>`;
}
function dateText() { return document.querySelector('[data-testid="release-date"]')?.textContent; }
function setup(data = new Map<string, string>()) {
  const listeners = new Set<(location: { pathname: string }) => void>();
  const history = { location: { pathname: `/album/${first}` }, listen: (listener: (location: { pathname: string }) => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
  const request = vi.fn<(definition: unknown, variables: Record<string, unknown>) => Promise<unknown>>().mockResolvedValue(metadata());
  const api = { Platform: { History: history }, GraphQL: { Definitions: { getAlbum: {} }, Request: request } };
  const manager = new FeatureManager([fullAlbumDate], { document, spicetify: api }, new SettingsStore({ get: key => data.get(key) ?? null, set: (key, value) => { data.set(key, value); } }), new StyleRegistry(document));
  managers.push(manager);
  return { manager, data, api, request, listeners, navigate(path: string) { history.location = { pathname: path }; for (const listener of listeners) listener(history.location); } };
}
beforeEach(() => header());
afterEach(async () => {
  for (const manager of managers.splice(0)) await manager.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("formats ordinal endings and preserves date-only components across timezones", () => {
  for (const [day, suffix] of [[1, "st"], [2, "nd"], [3, "rd"], [4, "th"], [11, "th"], [12, "th"], [13, "th"], [21, "st"], [22, "nd"], [23, "rd"], [31, "st"]] as const) {
    expect(formatReleaseDate({ isoString: `2026-10-${String(day).padStart(2, "0")}T23:00:00-12:00`, precision: "DAY" })?.label).toBe(`${day}${suffix} October 2026`);
  }
});

it("respects partial precision and rejects invalid or unknown dates", () => {
  expect(formatReleaseDate({ isoString: "2026-10-01", precision: "MONTH" })?.label).toBe("October 2026");
  expect(formatReleaseDate({ isoString: "2026", precision: "YEAR" })?.label).toBe("2026");
  expect(formatReleaseDate({ isoString: "2024-02-29", precision: "DAY" })?.label).toBe("29th February 2024");
  for (const isoString of ["2026-02-29", "1900-02-29", "2026-04-31", "2026-13-01", "2026-10-00", "2026-10", "not a date"]) {
    expect(formatReleaseDate({ isoString, precision: "DAY" })).toBeUndefined();
  }
  expect(formatReleaseDate({ isoString: "2026-10-13", precision: "UNKNOWN" })).toBeUndefined();
  expect(formatReleaseDate(null)).toBeUndefined();
  expect(readAlbumDate(metadata(second), `spotify:album:${first}`)).toBeUndefined();
  expect(readAlbumDate({ errors: [{ message: "Unavailable" }] }, `spotify:album:${first}`)).toBeUndefined();
});

it("starts off, changes only the header year, restores on disable, and persists its switch", async () => {
  const { manager, request, data, listeners } = setup();
  await manager.start(); expect(request).not.toHaveBeenCalled();
  const original = document.querySelector('[data-testid="release-date"]')!;
  await manager.setEnabled(fullAlbumDate.id, true);
  await vi.waitFor(() => expect(dateText()).toBe("13th October 2026"));
  expect(document.querySelector('[data-testid="release-date"]')).toBe(original);
  expect(listeners.size).toBe(1);
  const disabling = manager.setEnabled(fullAlbumDate.id, false);
  expect(dateText()).toBe("2026"); expect(listeners.size).toBe(0); await disabling;
  await manager.setEnabled(fullAlbumDate.id, true); await manager.dispose();
  expect(dateText()).toBe("2026");
  const next = setup(data); await next.manager.start();
  await vi.waitFor(() => expect(dateText()).toBe("13th October 2026"));
});

it("waits for a delayed header and disconnects after it appears", async () => {
  document.querySelector('[data-testid="album-page"]')!.replaceChildren();
  const { manager } = setup(); await manager.start(); await manager.setEnabled(fullAlbumDate.id, true);
  await Promise.resolve();
  document.querySelector('[data-testid="album-page"]')!.innerHTML = '<span data-testid="release-date">2026</span>';
  await vi.waitFor(() => expect(dateText()).toBe("13th October 2026"));
  await manager.setEnabled(fullAlbumDate.id, false);
  expect(dateText()).toBe("2026");
});

it("ignores late requests after navigation or disable", async () => {
  const { manager, request, navigate } = setup();
  let resolveFirst!: (response: unknown) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
  await manager.start(); await manager.setEnabled(fullAlbumDate.id, true);
  request.mockResolvedValueOnce(metadata(second, "2025-05-02", "DAY"));
  header("2025"); navigate(`/album/${second}`);
  await vi.waitFor(() => expect(dateText()).toBe("2nd May 2025"));
  resolveFirst(metadata()); await Promise.resolve();
  expect(dateText()).toBe("2nd May 2025");
  let resolveLate!: (response: unknown) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { resolveLate = resolve; }));
  header(); navigate(`/album/${first}`); await manager.setEnabled(fullAlbumDate.id, false);
  resolveLate(metadata()); await Promise.resolve();
  expect(dateText()).toBe("2026");
});

it("leaves foreign date modifications alone and makes no requests off album pages", async () => {
  const { manager, navigate, request } = setup();
  navigate("/collection"); await manager.start(); await manager.setEnabled(fullAlbumDate.id, true);
  expect(request).not.toHaveBeenCalled();
  navigate(`/album/${first}`);
  await vi.waitFor(() => expect(dateText()).toBe("13th October 2026"));
  document.querySelector('[data-testid="release-date"]')!.firstChild!.textContent = "Custom date";
  await manager.setEnabled(fullAlbumDate.id, false);
  expect(dateText()).toBe("Custom date");
});

it("waits for APIs exposed after startup without requiring Check again", async () => {
  const { manager, api } = setup();
  const history = api.Platform.History;
  delete (api.Platform as Partial<typeof api.Platform>).History;
  await manager.start();
  const enabling = manager.setEnabled(fullAlbumDate.id, true);
  await Promise.resolve();
  expect(manager.getSnapshot()[0]?.status).toBe("pending");
  api.Platform.History = history;
  await enabling;
  await vi.waitFor(() => expect(dateText()).toBe("13th October 2026"));
  expect(manager.getSnapshot()[0]?.status).toBe("enabled");
});

it("cancels readiness waiting immediately when disabled", async () => {
  const { manager, api, request } = setup();
  delete (api.GraphQL.Definitions as Record<string, unknown>).getAlbum;
  await manager.start();
  const enabling = manager.setEnabled(fullAlbumDate.id, true);
  await Promise.resolve();
  const disabling = manager.setEnabled(fullAlbumDate.id, false);
  await Promise.all([enabling, disabling]);
  expect(manager.getSnapshot()[0]?.status).toBe("disabled");
  expect(request).not.toHaveBeenCalled();
});

it("bounds readiness waiting to 30 seconds and supports a manual retry", async () => {
  vi.useFakeTimers();
  const { manager, api, request } = setup();
  delete (api.GraphQL.Definitions as Record<string, unknown>).getAlbum;
  vi.spyOn(console, "error").mockImplementation(() => {});
  await manager.start();
  const enabling = manager.setEnabled(fullAlbumDate.id, true);
  await vi.advanceTimersByTimeAsync(30_000);
  await enabling;
  expect(manager.getSnapshot()[0]?.status).toBe("error");
  expect(vi.getTimerCount()).toBe(0);
  api.GraphQL.Definitions.getAlbum = {};
  await manager.retry(fullAlbumDate.id);
  await vi.advanceTimersByTimeAsync(0);
  expect(dateText()).toBe("13th October 2026");
  expect(request).toHaveBeenCalledTimes(1);
});

it("isolates a failed album request", async () => {
  const { manager, request } = setup();
  request.mockRejectedValueOnce(new Error("Album unavailable"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await manager.start(); await manager.setEnabled(fullAlbumDate.id, true);
  await vi.waitFor(() => expect(manager.getSnapshot()[0]?.status).toBe("error"));
  expect(dateText()).toBe("2026");
});

it("suppresses the extra separator pseudo-element without replacing Spotify's bullet", async () => {
  document.querySelector('[data-testid="album-page"]')!.insertAdjacentHTML("beforeend", '<div class="main-entityHeader-metaData"><span data-separator="true">•</span></div>');
  const { manager } = setup(); await manager.start(); await manager.setEnabled(fullAlbumDate.id, true);
  expect(document.querySelector('[data-spiced-style="feature:full-album-date"]')?.textContent).toContain('::before { content: none !important; }');
  expect(document.querySelector('[data-separator="true"]')?.textContent).toBe("•");
  await manager.setEnabled(fullAlbumDate.id, false);
  expect(document.querySelector('[data-spiced-style="feature:full-album-date"]')).toBeNull();
});
