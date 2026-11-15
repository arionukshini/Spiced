import type { SpicetifyAPI } from "../compatibility/spicetify";

export type Cleanup = () => void;
export type Category = "appearance" | "interface" | "behavior";
export const categories: { id: Category; name: string; description: string }[] = [
  { id: "appearance", name: "Appearance", description: "Small visual touches, on your terms." },
  { id: "interface", name: "Interface", description: "Future layout and navigation improvements." },
  { id: "behavior", name: "Behavior", description: "Future everyday listening enhancements." },
];

export interface FeatureEnvironment {
  document: Document;
  spicetify: SpicetifyAPI;
}

export type SupportResult = { supported: true } | { supported: false; reason: string };

export interface FeatureContext extends FeatureEnvironment {
  signal: AbortSignal;
  addStyle(css: string): void;
  onCleanup(cleanup: Cleanup): void;
  listen(target: EventTarget, event: string, callback: (event: Event) => void | Promise<void>): void;
  guard<T extends unknown[]>(callback: (...args: T) => void | Promise<void>): (...args: T) => void;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: Category;
  defaultEnabled: boolean;
  checkSupport?: (environment: FeatureEnvironment) => SupportResult;
  activate(context: FeatureContext): void | Cleanup | Promise<void | Cleanup>;
}

export type FeatureStatus = "disabled" | "enabled" | "pending" | "unsupported" | "error";
export interface FeatureSnapshot {
  definition: FeatureDefinition;
  enabled: boolean;
  status: FeatureStatus;
  message?: string;
}

export interface SettingsModel {
  getSnapshot(): FeatureSnapshot[];
  subscribe(listener: Cleanup): Cleanup;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  retry(id: string): Promise<void>;
}

export interface PersistenceStatus {
  saved: boolean;
  message: string;
}
