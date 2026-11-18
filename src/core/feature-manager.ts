import { logger } from "./logger";
import { ResourceScope } from "./resource-scope";
import type { SettingsStore } from "./settings-store";
import type { StyleRegistry } from "./style-registry";
import type { Cleanup, FeatureDefinition, FeatureEnvironment, FeatureSnapshot, SettingsModel } from "./types";

interface Entry extends FeatureSnapshot {
  optionValues: Record<string, boolean>;
  choiceValues: Record<string, string>;
  scope?: ResourceScope;
  operation: Promise<void>;
  revision: number;
}

export class FeatureManager implements SettingsModel {
  private readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<Cleanup>();
  private readonly log = logger("features");
  private disposed = false;
  private disposal?: Promise<void>;

  constructor(
    definitions: readonly FeatureDefinition[],
    private readonly environment: FeatureEnvironment,
    private readonly store: SettingsStore,
    private readonly styles: StyleRegistry,
  ) {
    for (const definition of definitions) {
      if (!/^[a-z][a-z0-9-]*$/.test(definition.id) || this.entries.has(definition.id)) {
        throw new Error(`Invalid or duplicate feature ID: ${definition.id}`);
      }
      const optionValues: Record<string, boolean> = Object.create(null) as Record<string, boolean>;
      for (const option of definition.options ?? []) {
        if (!/^[a-z][a-z0-9-]*$/.test(option.id) || Object.hasOwn(optionValues, option.id)) {
          throw new Error(`Invalid or duplicate option ID in ${definition.id}: ${option.id}`);
        }
        optionValues[option.id] = store.get(`${definition.id}.${option.id}`, option.defaultEnabled);
      }
      const choiceValues: Record<string, string> = Object.create(null) as Record<string, string>;
      for (const choice of definition.choices ?? []) {
        if (!/^[a-z][a-z0-9-]*$/.test(choice.id) || Object.hasOwn(choiceValues, choice.id) || !choice.values.some(item => item.value === choice.defaultValue)) {
          throw new Error(`Invalid choice in ${definition.id}: ${choice.id}`);
        }
        const saved = store.getChoice(`${definition.id}.${choice.id}`, choice.defaultValue);
        choiceValues[choice.id] = choice.values.some(item => item.value === saved) ? saved : choice.defaultValue;
      }
      this.entries.set(definition.id, {
        definition, enabled: store.get(definition.id, definition.defaultEnabled),
        optionValues, choiceValues, status: "disabled", operation: Promise.resolve(), revision: 0,
      });
    }
  }

  async start(): Promise<void> {
    await Promise.all([...this.entries.values()].map(entry => this.queue(entry)));
  }

  getSnapshot(): FeatureSnapshot[] {
    return [...this.entries.values()].map(({ definition, enabled, status, message, optionValues, choiceValues }) => ({
      definition, enabled, status, message,
      choices: definition.choices?.map(choice => ({ definition: choice, value: choiceValues[choice.id]! })),
      options: definition.options?.map(option => ({ definition: option, enabled: optionValues[option.id]! })),
    }));
  }

  subscribe(listener: Cleanup): Cleanup {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  setEnabled(id: string, enabled: boolean): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const entry = this.getEntry(id);
    entry.enabled = enabled;
    this.store.set(id, enabled);
    if (!enabled) {
      try { this.cleanup(entry); } catch (error) {
        ++entry.revision;
        this.fail(entry, error);
        return Promise.resolve();
      }
    }
    return this.queue(entry);
  }

  retry(id: string): Promise<void> {
    if (this.disposed) return Promise.resolve();
    return this.queue(this.getEntry(id));
  }

  setOption(id: string, optionId: string, enabled: boolean): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const entry = this.getEntry(id);
    if (!Object.hasOwn(entry.optionValues, optionId)) throw new Error(`Unknown option: ${id}.${optionId}`);
    entry.optionValues[optionId] = enabled;
    this.store.set(`${id}.${optionId}`, enabled);
    if (!entry.enabled) {
      this.emit();
      return Promise.resolve();
    }
    try { this.cleanup(entry); } catch (error) {
      ++entry.revision;
      this.fail(entry, error);
      return Promise.resolve();
    }
    return this.queue(entry);
  }

  setChoice(id: string, choiceId: string, value: string): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const entry = this.getEntry(id);
    const definition = entry.definition.choices?.find(choice => choice.id === choiceId);
    if (!definition?.values.some(item => item.value === value)) throw new Error(`Invalid choice: ${id}.${choiceId}`);
    entry.choiceValues[choiceId] = value;
    this.store.setChoice(`${id}.${choiceId}`, value);
    if (!entry.enabled) { this.emit(); return Promise.resolve(); }
    try { this.cleanup(entry); } catch (error) {
      ++entry.revision;
      this.fail(entry, error);
      return Promise.resolve();
    }
    return this.queue(entry);
  }

  private getEntry(id: string): Entry {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown feature: ${id}`);
    return entry;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch (error) { this.log.error("Settings subscriber failed", error); }
    }
  }

  private queue(entry: Entry): Promise<void> {
    const revision = ++entry.revision;
    entry.status = "pending";
    entry.message = undefined;
    this.emit();
    entry.operation = entry.operation.then(async () => {
      if (revision !== entry.revision || this.disposed) return;
      await this.reconcile(entry, revision);
    }).catch(error => this.fail(entry, error));
    return entry.operation;
  }

  private cleanup(entry: Entry): void {
    const scope = entry.scope;
    entry.scope = undefined;
    scope?.dispose();
  }

  private fail(entry: Entry, error: unknown): void {
    this.log.error(entry.definition.id, error);
    try { this.cleanup(entry); } catch (cleanupError) { this.log.error("Cleanup failed", cleanupError); }
    entry.status = "error";
    entry.message = "This feature could not be applied or fully cleaned up. See the Spotify console for details.";
    this.emit();
  }

  private async reconcile(entry: Entry, revision: number): Promise<void> {
    this.cleanup(entry);
    const support = entry.definition.checkSupport?.(this.environment) ?? { supported: true };
    if (!support.supported) {
      entry.status = "unsupported";
      entry.message = support.reason;
      this.emit();
      return;
    }
    if (!entry.enabled) {
      entry.status = "disabled";
      this.emit();
      return;
    }
    const scope = new ResourceScope(error => {
      if (entry.scope === scope) this.fail(entry, error);
    });
    entry.scope = scope;
    const context = {
      ...this.environment,
      choices: Object.freeze({ ...entry.choiceValues }),
      options: Object.freeze({ ...entry.optionValues }),
      signal: scope.signal,
      onCleanup: scope.onCleanup,
      guard: scope.guard,
      listen: scope.listen,
      addStyle: (css: string) => {
        if (!scope.signal.aborted) scope.onCleanup(this.styles.inject(`feature:${entry.definition.id}`, css));
      },
    };
    let onAbort!: () => void;
    const aborted = new Promise<void>(resolve => {
      onAbort = resolve;
      scope.signal.addEventListener("abort", onAbort, { once: true });
    });
    const activation = (async () => {
      const cleanup = await entry.definition.activate(context);
      if (typeof cleanup === "function") scope.onCleanup(cleanup);
    })().catch(error => {
      if (scope.signal.aborted) this.log.warn("Cancelled feature initialization or late cleanup failed", entry.definition.id, error);
      else throw error;
    });
    try { await Promise.race([activation, aborted]); }
    finally { scope.signal.removeEventListener("abort", onAbort); }
    if (this.disposed || revision !== entry.revision || scope.signal.aborted) {
      if (entry.scope === scope) this.cleanup(entry);
      return;
    }
    entry.status = "enabled";
    this.log.debug("Enabled", entry.definition.id);
    this.emit();
  }

  dispose(): Promise<void> {
    if (this.disposal) return this.disposal;
    this.disposed = true;
    for (const entry of this.entries.values()) {
      try { this.cleanup(entry); } catch (error) { this.log.error("Cleanup failed", entry.definition.id, error); }
    }
    this.listeners.clear();
    this.disposal = Promise.all([...this.entries.values()].map(entry => entry.operation)).then(() => {});
    return this.disposal;
  }
}
