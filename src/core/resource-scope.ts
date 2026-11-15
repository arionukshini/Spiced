import type { Cleanup } from "./types";

export class ResourceScope {
  private readonly controller = new AbortController();
  private cleanups: Cleanup[] = [];
  private disposed = false;
  readonly signal = this.controller.signal;

  constructor(private readonly onError: (error: unknown) => void) {}

  onCleanup = (cleanup: Cleanup): void => {
    if (this.disposed) cleanup();
    else this.cleanups.push(cleanup);
  };

  guard = <T extends unknown[]>(callback: (...args: T) => void | Promise<void>): ((...args: T) => void) => {
    return (...args: T) => {
      if (this.signal.aborted) return;
      try {
        const result = callback(...args);
        if (result) void Promise.resolve(result).catch(error => {
          if (!this.signal.aborted) this.onError(error);
        });
      } catch (error) {
        this.onError(error);
      }
    };
  };

  listen = (target: EventTarget, event: string, callback: (event: Event) => void | Promise<void>): void => {
    const guarded = this.guard(callback);
    this.onCleanup(() => target.removeEventListener(event, guarded));
    if (!this.signal.aborted) target.addEventListener(event, guarded);
  };

  abort(): void { this.controller.abort(); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.abort();
    const errors: unknown[] = [];
    for (const cleanup of this.cleanups.reverse()) {
      try { cleanup(); } catch (error) { errors.push(error); }
    }
    this.cleanups = [];
    if (errors.length) throw new AggregateError(errors, "Feature cleanup failed");
  }
}
