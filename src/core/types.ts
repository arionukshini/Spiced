import type { SpicetifyAPI } from "../compatibility/spicetify";

export type Cleanup = () => void;
export type Category = "appearance" | "interface" | "behavior";
export const categories: { id: Category; name: string; description: string }[] = [
  { id: "appearance", name: "Appearance", description: "Small visual touches, on your terms." },
  { id: "interface", name: "Interface", description: "A quicker, more comfortable interface." },
  { id: "behavior", name: "Behavior", description: "Future everyday listening enhancements." },
];

export interface FeatureEnvironment {
  document: Document;
  spicetify: SpicetifyAPI;
}

export type SupportResult = { supported: true } | { supported: false; reason: string };

export interface FeatureContext extends FeatureEnvironment {
  options: Readonly<Record<string, boolean>>;
  choices: Readonly<Record<string, string>>;
  signal: AbortSignal;
  addStyle(css: string): void;
  onCleanup(cleanup: Cleanup): void;
  listen(target: EventTarget, event: string, callback: (event: Event) => void | Promise<void>): void;
  guard<T extends unknown[]>(callback: (...args: T) => void | Promise<void>): (...args: T) => void;
}

export interface FeatureOptionDefinition {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
}

export interface FeatureChoiceDefinition {
  id: string;
  name: string;
  description: string;
  defaultValue: string;
  values: readonly { value: string; label: string }[];
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: Category;
  defaultEnabled: boolean;
  choices?: readonly FeatureChoiceDefinition[];
  optionsLabel?: string;
  options?: readonly FeatureOptionDefinition[];
  checkSupport?: (environment: FeatureEnvironment) => SupportResult;
  activate(context: FeatureContext): void | Cleanup | Promise<void | Cleanup>;
}

export type FeatureStatus = "disabled" | "enabled" | "pending" | "unsupported" | "error";
export interface FeatureSnapshot {
  definition: FeatureDefinition;
  enabled: boolean;
  status: FeatureStatus;
  message?: string;
  options?: readonly { definition: FeatureOptionDefinition; enabled: boolean }[];
  choices?: readonly { definition: FeatureChoiceDefinition; value: string }[];
}

export interface SettingsModel {
  getSnapshot(): FeatureSnapshot[];
  subscribe(listener: Cleanup): Cleanup;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  setOption(id: string, optionId: string, enabled: boolean): Promise<void>;
  setChoice(id: string, choiceId: string, value: string): Promise<void>;
  retry(id: string): Promise<void>;
}

export interface PersistenceStatus {
  saved: boolean;
  message: string;
}
