import type { StorageAPI } from "../compatibility/spicetify";
import type { PersistenceStatus } from "./types";
import { logger } from "./logger";

export const SETTINGS_KEY = "spiced:settings";
const log = logger("settings");

export class SettingsStore {
  private values: Record<string, boolean> = Object.create(null) as Record<string, boolean>;
  private choices: Record<string, string> = Object.create(null) as Record<string, string>;
  private writable = true;
  private status: PersistenceStatus = { saved: true, message: "Changes save automatically" };

  constructor(private readonly storage?: StorageAPI) {
    try {
      if (!storage) throw new Error("Spicetify.LocalStorage is unavailable");
      const raw = storage.get(SETTINGS_KEY);
      if (!raw) return;
      const data: unknown = JSON.parse(raw);
      if (!data || typeof data !== "object" || !("version" in data) || !("features" in data)) {
        throw new Error("Invalid settings format");
      }
      if (data.version !== 1) {
        this.writable = false;
        throw new Error("Settings were written by a different version; stored data is preserved");
      }
      if (!data.features || typeof data.features !== "object" || Array.isArray(data.features)) {
        throw new Error("Invalid feature settings");
      }
      if ("choices" in data && data.choices && typeof data.choices === "object" && !Array.isArray(data.choices)) {
        for (const [id, value] of Object.entries(data.choices)) {
          if (typeof value === "string") this.choices[id] = value;
        }
      }
      for (const [id, enabled] of Object.entries(data.features)) {
        if (typeof enabled === "boolean") this.values[id] = enabled;
      }
    } catch (error) {
      this.status = { saved: false, message: "Settings could not be loaded. Changes are session-only until saving succeeds." };
      if (!this.writable) this.status.message = "Settings version is unsupported. Changes are session-only; existing data is preserved.";
      log.warn(this.status.message, error);
    }
  }

  get(id: string, fallback: boolean): boolean {
    return this.values[id] ?? fallback;
  }

  getChoice(id: string, fallback: string): string { return this.choices[id] ?? fallback; }

  setChoice(id: string, value: string): void {
    this.choices[id] = value;
    this.save();
  }

  set(id: string, enabled: boolean): void {
    this.values[id] = enabled;
    this.save();
  }

  private save(): void {
    try {
      if (!this.storage || !this.writable) throw new Error("Persistent settings are unavailable");
      this.storage.set(SETTINGS_KEY, JSON.stringify({ version: 1, features: this.values, choices: this.choices }));
      this.status = { saved: true, message: "All changes saved" };
    } catch (error) {
      this.status = { saved: false, message: this.writable
        ? "Could not save. Your changes work for this session; try toggling again to retry saving."
        : "Settings version is unsupported. Changes are session-only; existing data is preserved." };
      log.warn(this.status.message, error);
    }
  }

  getStatus(): PersistenceStatus { return { ...this.status }; }
}
