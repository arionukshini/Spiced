import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeatureDefinition, FeatureSnapshot, PersistenceStatus, SettingsModel } from "../src/core/types";
import { createSettings } from "../src/ui/settings";

const definition: FeatureDefinition = {
  id: "orange-demo", name: "Orange preview border", description: "Adds a border to the preview only.",
  category: "appearance", defaultEnabled: false, activate: () => {},
};

function setup() {
  let snapshot: FeatureSnapshot = { definition, enabled: false, status: "disabled" };
  let persistence: PersistenceStatus = { saved: true, message: "All changes saved" };
  const listeners = new Set<() => void>();
  const emit = () => { for (const listener of listeners) listener(); };
  const model: SettingsModel = {
    getSnapshot: () => [snapshot],
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setEnabled: vi.fn(async (_id, enabled) => {
      snapshot = { ...snapshot, enabled, status: enabled ? "enabled" : "disabled" };
      emit();
    }),
    retry: vi.fn(async () => {}),
  };
  const open = () => {
    const view = createSettings(model, () => persistence);
    document.body.append(view);
    return view;
  };
  const view = open();
  return {
    view, model, open, listeners,
    setSnapshot: (next: Partial<FeatureSnapshot>) => { snapshot = { ...snapshot, ...next }; emit(); },
    setPersistence: (next: PersistenceStatus) => { persistence = next; emit(); },
  };
}

afterEach(() => { document.body.replaceChildren(); document.head.replaceChildren(); });

describe("settings view", () => {
  it("uses an accessible native switch and preserves focus and its DOM node on updates", async () => {
    const { view, model } = setup();
    const input = view.querySelector("input")!;
    expect(input.type).toBe("checkbox");
    expect(input.getAttribute("role")).toBe("switch");
    expect(document.getElementById(input.getAttribute("aria-labelledby")!)?.textContent).toBe(definition.name);
    const describedIds = input.getAttribute("aria-describedby")!.split(" ");
    expect(describedIds.every(id => document.getElementById(id))).toBe(true);
    input.focus();
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
    expect(model.setEnabled).toHaveBeenCalledWith("orange-demo", true);
    expect(document.activeElement).toBe(input);
    expect(view.querySelector("input")).toBe(input);
    expect(input.checked).toBe(true);
    expect(view.querySelector(".spiced-summary")?.textContent).toBe("1 of 1 feature active");
    expect(view.querySelectorAll("section")).toHaveLength(3);
    expect(view.querySelectorAll("[data-spiced-demo]")).toHaveLength(1);
    expect(view.querySelectorAll("input")).toHaveLength(1);
  });

  it("releases subscriptions on removal and does not accumulate them when reopened", () => {
    const { view, open, listeners } = setup();
    expect(listeners.size).toBe(1);
    view.remove();
    expect(listeners.size).toBe(0);
    const next = open();
    expect(listeners.size).toBe(1);
    next.remove();
    expect(listeners.size).toBe(0);
    document.body.append(next);
    expect(listeners.size).toBe(1);
    next.remove();
    expect(listeners.size).toBe(0);
  });

  it("explains unsupported features, supports rechecks, and keeps enabled ones removable", async () => {
    const { view, model, setSnapshot } = setup();
    setSnapshot({ status: "unsupported", message: "Target is unavailable in this Spotify version." });
    const input = view.querySelector("input")!;
    const retry = view.querySelector<HTMLButtonElement>(".spiced-retry")!;
    expect(input.disabled).toBe(true);
    expect(view.querySelector(".spiced-feature-message")?.textContent).toContain("Target is unavailable");
    expect(retry.hidden).toBe(false);
    expect(retry.textContent).toBe("Check again");
    retry.click();
    await Promise.resolve();
    expect(model.retry).toHaveBeenCalledWith("orange-demo");
    setSnapshot({ enabled: true });
    expect(input.disabled).toBe(false);
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    expect(model.setEnabled).toHaveBeenCalledWith("orange-demo", false);
  });

  it("shows failure and pending states without trapping the toggle", async () => {
    const { view, model, setSnapshot } = setup();
    setSnapshot({ status: "error", enabled: true, message: "The feature failed to apply." });
    const retry = view.querySelector<HTMLButtonElement>(".spiced-retry")!;
    expect(view.querySelector(".spiced-feature-status")?.textContent).toBe("Needs attention");
    expect(retry.hidden).toBe(false);
    expect(retry.textContent).toBe("Try again");
    retry.click();
    await Promise.resolve();
    expect(model.retry).toHaveBeenCalledWith("orange-demo");
    setSnapshot({ status: "pending", message: undefined });
    expect(view.querySelector(".spiced-feature-status")?.textContent).toBe("Applying…");
    expect(view.querySelector("input")?.disabled).toBe(false);
    expect(retry.hidden).toBe(true);
  });

  it("announces persistence failures and successful saving", () => {
    const { view, setPersistence } = setup();
    const notice = view.querySelector<HTMLElement>(".spiced-persistence")!;
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.getAttribute("aria-live")).toBe("polite");
    expect(notice.dataset.saved).toBe("true");
    setPersistence({ saved: false, message: "Could not save. Changes are session-only." });
    expect(notice.dataset.saved).toBe("false");
    expect(notice.textContent).toContain("session-only");
    setPersistence({ saved: true, message: "All changes saved" });
    expect(notice.dataset.saved).toBe("true");
    expect(notice.textContent).toBe("All changes saved");
  });
});
