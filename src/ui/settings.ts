import { categories } from "../core/types";
import type { Cleanup, FeatureSnapshot, PersistenceStatus, SettingsModel } from "../core/types";

interface FeatureRow {
  row: HTMLElement;
  name: HTMLElement;
  description: HTMLElement;
  input: HTMLInputElement;
  status: HTMLElement;
  message: HTMLElement;
  retry: HTMLButtonElement;
}

let nextViewId = 0;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

class SettingsElement extends HTMLElement {
  private model?: SettingsModel;
  private persistence?: () => PersistenceStatus;
  private unsubscribe?: Cleanup;
  private rows = new Map<string, FeatureRow>();
  private groups = new Map<string, { container: HTMLElement; empty: HTMLElement; count: HTMLElement }>();
  private saved = element("p", "spiced-persistence");
  private summary = element("span", "spiced-summary");
  private error = element("p", "spiced-ui-error");
  private viewId = `spiced-view-${++nextViewId}`;
  private built = false;

  configure(model: SettingsModel, persistence: () => PersistenceStatus): void {
    this.unsubscribe?.();
    this.model = model;
    this.persistence = persistence;
    if (!this.built) this.build();
    if (this.isConnected) this.subscribe();
    this.update();
  }

  connectedCallback(): void {
    if (this.model) this.subscribe();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.model?.subscribe(() => this.update());
    this.update();
  }

  private build(): void {
    this.className = "spiced-settings";
    const header = element("header", "spiced-header");
    const brand = element("div", "spiced-brand");
    const mark = element("span", "spiced-mark", "s");
    mark.setAttribute("aria-hidden", "true");
    const wordmark = element("span", "spiced-wordmark", "spiced");
    const version = element("span", "spiced-version", `v${__VERSION__}`);
    brand.append(mark, wordmark, version);
    const title = element("h2", "spiced-title", "Your Spotify. Your way.");
    header.append(brand, title, element("p", "spiced-intro", "Small improvements, one switch at a time. Changes apply immediately."));

    const overview = element("div", "spiced-overview");
    overview.append(this.summary, element("span", "spiced-live", "No restart needed"));
    this.saved.setAttribute("role", "status");
    this.saved.setAttribute("aria-live", "polite");
    this.error.setAttribute("role", "alert");
    this.error.hidden = true;
    this.append(header, overview, this.error);

    for (const category of categories) {
      const section = element("section", "spiced-category");
      const heading = element("div", "spiced-category-heading");
      const name = element("h3", "spiced-category-title", category.name);
      name.id = `${this.viewId}-${category.id}`;
      section.setAttribute("aria-labelledby", name.id);
      const count = element("span", "spiced-count");
      count.setAttribute("aria-hidden", "true");
      heading.append(name, count);
      const container = element("div", "spiced-features");
      const empty = element("p", "spiced-empty", "No features added yet.");
      section.append(heading, element("p", "spiced-category-description", category.description), container, empty);
      this.groups.set(category.id, { container, empty, count });
      this.append(section);

      if (category.id === "appearance") {
        const preview = element("div", "spiced-preview");
        preview.setAttribute("data-spiced-demo", "");
        preview.setAttribute("aria-label", "CSS demo preview");
        const artwork = element("div", "spiced-preview-art");
        artwork.setAttribute("aria-hidden", "true");
        artwork.append(element("span", "spiced-preview-disc"));
        const copy = element("div", "spiced-preview-copy");
        copy.append(element("span", "spiced-eyebrow", "LIVE PREVIEW"), element("p", "spiced-preview-title", "A small touch of orange"), element("p", "spiced-preview-description", "The example switch adds a border to this card only."));
        preview.append(artwork, copy);
        section.append(preview);
      }
    }

    const footer = element("footer", "spiced-footer");
    footer.append(this.saved, element("p", "spiced-footer-note", "A foundation for your snippets. More features will be added as you choose them."));
    this.append(footer);
    this.built = true;
  }

  private createRow(snapshot: FeatureSnapshot): FeatureRow {
    const { definition } = snapshot;
    const id = `${this.viewId}-${definition.id}`;
    const row = element("div", "spiced-feature");
    const copy = element("div", "spiced-feature-copy");
    const title = element("div", "spiced-feature-title");
    const name = element("label", "spiced-feature-name", definition.name);
    name.id = `${id}-name`;
    name.htmlFor = `${id}-toggle`;
    const status = element("span", "spiced-feature-status");
    status.id = `${id}-status`;
    status.setAttribute("role", "status");
    title.append(name, status);
    const description = element("p", "spiced-feature-description", definition.description);
    description.id = `${id}-description`;
    const message = element("p", "spiced-feature-message");
    message.id = `${id}-message`;
    const retry = element("button", "spiced-retry", "Try again");
    retry.type = "button";
    retry.addEventListener("click", () => this.run(() => this.model!.retry(definition.id)));
    copy.append(title, description, message, retry);
    const control = element("label", "spiced-switch");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `${id}-toggle`;
    input.setAttribute("role", "switch");
    input.setAttribute("aria-labelledby", name.id);
    input.setAttribute("aria-describedby", `${description.id} ${status.id} ${message.id}`);
    input.addEventListener("change", () => this.run(() => this.model!.setEnabled(definition.id, input.checked)));
    const track = element("span", "spiced-switch-track");
    track.setAttribute("aria-hidden", "true");
    control.append(input, track);
    row.append(copy, control);
    return { row, name, description, input, status, message, retry };
  }

  private update(): void {
    if (!this.model || !this.built) return;
    const snapshots = this.model.getSnapshot();
    const currentIds = new Set(snapshots.map(({ definition }) => definition.id));
    for (const [id, row] of this.rows) {
      if (!currentIds.has(id)) {
        row.row.remove();
        this.rows.delete(id);
      }
    }
    for (const snapshot of snapshots) {
      let row = this.rows.get(snapshot.definition.id);
      if (!row) {
        row = this.createRow(snapshot);
        this.rows.set(snapshot.definition.id, row);
        this.groups.get(snapshot.definition.category)?.container.append(row.row);
      }
      row.name.textContent = snapshot.definition.name;
      row.description.textContent = snapshot.definition.description;
      row.input.checked = snapshot.enabled;
      row.input.disabled = snapshot.status === "unsupported" && !snapshot.enabled;
      row.row.dataset.status = snapshot.status;
      row.status.textContent = {
        enabled: "On",
        disabled: "Off",
        pending: "Applying…",
        unsupported: "Unavailable",
        error: "Needs attention",
      }[snapshot.status];
      row.message.textContent = snapshot.message ?? "";
      row.message.hidden = !snapshot.message;
      row.retry.hidden = snapshot.status !== "unsupported" && snapshot.status !== "error";
      row.retry.textContent = snapshot.status === "unsupported" ? "Check again" : "Try again";
      row.retry.setAttribute("aria-label", `${row.retry.textContent}: ${snapshot.definition.name}`);
    }
    for (const category of categories) {
      const group = this.groups.get(category.id)!;
      const count = snapshots.filter(({ definition }) => definition.category === category.id).length;
      group.empty.hidden = count > 0;
      group.count.textContent = count ? String(count) : "";
      group.count.hidden = count === 0;
    }
    const enabled = snapshots.filter(({ status }) => status === "enabled").length;
    this.summary.textContent = `${enabled} of ${snapshots.length} ${snapshots.length === 1 ? "feature" : "features"} active`;
    const persistence = this.persistence?.();
    if (persistence) {
      this.saved.textContent = persistence.message;
      this.saved.dataset.saved = String(persistence.saved);
    }
  }

  private run(action: () => Promise<void>): void {
    this.error.hidden = true;
    void action().catch((error: unknown) => {
      console.warn("[Spiced] Could not update a setting", error);
      this.error.textContent = "Could not update this setting. Please try again.";
      this.error.hidden = false;
      this.update();
    });
  }
}

export function createSettings(model: SettingsModel, getPersistenceStatus: () => PersistenceStatus): HTMLElement {
  if (!customElements.get("spiced-settings")) customElements.define("spiced-settings", SettingsElement);
  const view = document.createElement("spiced-settings") as SettingsElement;
  view.configure(model, getPersistenceStatus);
  return view;
}
