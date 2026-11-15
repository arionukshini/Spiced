import type { Cleanup } from "./types";

export class StyleRegistry {
  private readonly styles = new Map<string, { element: HTMLStyleElement; token: symbol }>();

  constructor(private readonly document: Document) {}

  inject(key: string, css: string): Cleanup {
    const element = this.styles.get(key)?.element ?? this.document.createElement("style");
    element.dataset.spicedStyle = key;
    if (element.textContent !== css) element.textContent = css;
    if (!element.isConnected) {
      if (!this.document.head) throw new Error("The document head is unavailable");
      this.document.head.append(element);
    }
    const token = Symbol(key);
    this.styles.set(key, { element, token });
    return () => {
      if (this.styles.get(key)?.token !== token) return;
      element.remove();
      this.styles.delete(key);
    };
  }

  dispose(): void {
    for (const { element } of this.styles.values()) element.remove();
    this.styles.clear();
  }
}
