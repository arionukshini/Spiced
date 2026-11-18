import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureManager } from "../src/core/feature-manager";
import { SettingsStore, SETTINGS_KEY } from "../src/core/settings-store";
import { StyleRegistry } from "../src/core/style-registry";
import type { FeatureContext, FeatureDefinition } from "../src/core/types";
import { hideIcons } from "../src/features/hide-icons";

const instances: { manager: FeatureManager; styles: StyleRegistry }[] = [];
const fixture = `
  <header>
    <button id="fullscreen-tv-button" aria-label="TV Mode Display">TV mode</button>
    <button data-testid="whats-new-feed-button">What's New</button>
    <button data-testid="friend-activity-button">Listening activity</button>
    <button id="profile-button" aria-label="Profile">Profile</button>
  </header>
  <footer><button data-testid="control-button-playpause">Play</button></footer>`;

function storage() {
  const data = new Map<string, string>();
  return {
    get: (key: string) => data.get(key) ?? null,
    set: (key: string, value: string) => { data.set(key, value); },
  };
}

function setup(backend = storage(), definitions: FeatureDefinition[] = [hideIcons]) {
  const styles = new StyleRegistry(document);
  const manager = new FeatureManager(definitions, { document, spicetify: {} }, new SettingsStore(backend), styles);
  instances.push({ manager, styles });
  return { manager, styles, backend };
}

function iconStyles() {
  return document.querySelectorAll<HTMLStyleElement>('[data-spiced-style="feature:hide-icons"]');
}

function display(selector: string) {
  return getComputedStyle(document.querySelector(selector)!).display;
}

function choices(manager: FeatureManager) {
  return Object.fromEntries(manager.getSnapshot()[0]!.options!.map(option => [option.definition.id, option.enabled]));
}

beforeEach(() => { document.body.innerHTML = fixture; });

afterEach(async () => {
  for (const { manager, styles } of instances.splice(0)) {
    await manager.dispose();
    styles.dispose();
  }
  document.body.innerHTML = "";
});

describe("hide icons", () => {
  it("starts with the master off and all three choices selected", async () => {
    const markup = document.body.innerHTML;
    const { manager } = setup();
    await manager.start();

    expect(manager.getSnapshot()[0]).toMatchObject({ enabled: false, status: "disabled" });
    expect(choices(manager)).toEqual({ "tv-mode": true, "whats-new": true, "friend-activity": true });
    expect(iconStyles()).toHaveLength(0);
    expect(document.body.innerHTML).toBe(markup);
  });

  it("persists choices made while off without activating any styles", async () => {
    const { manager, backend } = setup();
    await manager.start();
    await manager.setOption("hide-icons", "whats-new", false);

    expect(choices(manager)["whats-new"]).toBe(false);
    expect(JSON.parse(backend.get(SETTINGS_KEY)!).features["hide-icons.whats-new"]).toBe(false);
    expect(manager.getSnapshot()[0]?.status).toBe("disabled");
    expect(iconStyles()).toHaveLength(0);
    expect(display('[data-testid="whats-new-feed-button"]')).not.toBe("none");
  });

  it("hides only selected shortcuts and preserves profile and player controls", async () => {
    const markup = document.body.innerHTML;
    const { manager } = setup();
    await manager.start();
    await manager.setOption("hide-icons", "whats-new", false);
    await manager.setEnabled("hide-icons", true);

    expect(display("#fullscreen-tv-button")).toBe("none");
    expect(display('[data-testid="friend-activity-button"]')).toBe("none");
    expect(display('[data-testid="whats-new-feed-button"]')).not.toBe("none");
    expect(display("#profile-button")).not.toBe("none");
    expect(display('[data-testid="control-button-playpause"]')).not.toBe("none");
    expect(document.body.innerHTML).toBe(markup);
  });

  it("updates one owned stylesheet without duplicating it or removing other styles", async () => {
    const { manager, styles } = setup();
    styles.inject("another-feature", "#profile-button { color: orange }");
    const otherStyle = document.querySelector('[data-spiced-style="another-feature"]');
    await manager.start();
    await manager.setEnabled("hide-icons", true);
    const initialStyle = iconStyles()[0]!;
    expect(display('[data-testid="whats-new-feed-button"]')).toBe("none");

    await manager.setOption("hide-icons", "whats-new", false);
    expect(initialStyle.isConnected).toBe(false);
    expect(iconStyles()).toHaveLength(1);
    expect(display('[data-testid="whats-new-feed-button"]')).not.toBe("none");
    expect(display("#fullscreen-tv-button")).toBe("none");
    expect(otherStyle?.isConnected).toBe(true);

    await manager.setOption("hide-icons", "whats-new", true);
    expect(iconStyles()).toHaveLength(1);
    expect(display('[data-testid="whats-new-feed-button"]')).toBe("none");
    expect(otherStyle?.isConnected).toBe(true);
  });

  it("restores controls immediately on disable and retains selections across a new manager", async () => {
    const { manager, backend } = setup();
    await manager.start();
    await manager.setOption("hide-icons", "whats-new", false);
    await manager.setOption("hide-icons", "friend-activity", false);
    await manager.setEnabled("hide-icons", true);
    expect(display("#fullscreen-tv-button")).toBe("none");

    const disabling = manager.setEnabled("hide-icons", false);
    expect(iconStyles()).toHaveLength(0);
    expect(display("#fullscreen-tv-button")).not.toBe("none");
    await disabling;
    await manager.dispose();

    const next = setup(backend);
    await next.manager.start();
    expect(next.manager.getSnapshot()[0]).toMatchObject({ enabled: false, status: "disabled" });
    expect(choices(next.manager)).toEqual({ "tv-mode": true, "whats-new": false, "friend-activity": false });
    expect(iconStyles()).toHaveLength(0);

    await next.manager.setEnabled("hide-icons", true);
    expect(display("#fullscreen-tv-button")).toBe("none");
    expect(display('[data-testid="whats-new-feed-button"]')).not.toBe("none");
    expect(display('[data-testid="friend-activity-button"]')).not.toBe("none");
  });

  it("applies to controls inserted after activation, including supported older markup", async () => {
    document.body.innerHTML = "";
    const { manager } = setup();
    await manager.start();
    await manager.setEnabled("hide-icons", true);
    expect(manager.getSnapshot()[0]?.status).toBe("enabled");

    document.body.innerHTML = fixture + `
      <button class="main-topBar-buddyFeed" aria-label="What's New">New releases</button>
      <button data-restore-focus-key="buddy_feed">Friends</button>`;

    expect(display("#fullscreen-tv-button")).toBe("none");
    expect(display('[data-testid="whats-new-feed-button"]')).toBe("none");
    expect(display('[data-testid="friend-activity-button"]')).toBe("none");
    expect(display('button[aria-label="What\'s New"]')).toBe("none");
    expect(display('[data-restore-focus-key="buddy_feed"]')).toBe("none");
    expect(display("#profile-button")).not.toBe("none");
  });

  it("injects no stylesheet when every icon choice is off", async () => {
    const { manager } = setup();
    await manager.start();
    for (const option of hideIcons.options!) await manager.setOption("hide-icons", option.id, false);
    await manager.setEnabled("hide-icons", true);

    expect(manager.getSnapshot()[0]).toMatchObject({ enabled: true, status: "enabled" });
    expect(iconStyles()).toHaveLength(0);
    expect(display("#fullscreen-tv-button")).not.toBe("none");
    expect(display('[data-testid="whats-new-feed-button"]')).not.toBe("none");
    expect(display('[data-testid="friend-activity-button"]')).not.toBe("none");
  });
});

describe("feature option lifecycle", () => {
  it("cancels pending activation and restarts with an immutable snapshot of the new options", async () => {
    let finishFirst!: () => void;
    const contexts: FeatureContext[] = [];
    const lateCleanup = vi.fn();
    const definition: FeatureDefinition = {
      id: "async-options", name: "Async options", description: "Lifecycle fixture", category: "interface", defaultEnabled: true,
      options: [{ id: "selected", name: "Selected", description: "Fixture choice", defaultEnabled: true }],
      activate: async context => {
        contexts.push(context);
        context.addStyle(`button { color: ${context.options.selected ? "orange" : "blue"} }`);
        if (context.options.selected) {
          await new Promise<void>(resolve => { finishFirst = resolve; });
          context.addStyle("button { color: red }");
          return lateCleanup;
        }
      },
    };
    const { manager } = setup(storage(), [definition]);
    const starting = manager.start();
    await Promise.resolve();
    expect(contexts).toHaveLength(1);
    expect(manager.getSnapshot()[0]?.status).toBe("pending");

    const updating = manager.setOption("async-options", "selected", false);
    expect(contexts[0]!.signal.aborted).toBe(true);
    expect(document.querySelectorAll('[data-spiced-style="feature:async-options"]')).toHaveLength(0);
    await Promise.all([starting, updating]);

    expect(contexts).toHaveLength(2);
    expect(contexts[0]!.options.selected).toBe(true);
    expect(contexts[1]!.options.selected).toBe(false);
    expect(Object.isFrozen(contexts[1]!.options)).toBe(true);
    expect(manager.getSnapshot()[0]?.status).toBe("enabled");
    expect(document.querySelector('[data-spiced-style="feature:async-options"]')?.textContent).toContain("blue");

    finishFirst();
    await Promise.resolve();
    await Promise.resolve();
    expect(lateCleanup).toHaveBeenCalledOnce();
    expect(document.querySelectorAll('[data-spiced-style="feature:async-options"]')).toHaveLength(1);
    expect(document.querySelector('[data-spiced-style="feature:async-options"]')?.textContent).toContain("blue");
  });
});
