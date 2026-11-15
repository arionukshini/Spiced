import { getSpicetify, hasSettingsAPI } from "./compatibility/spicetify";
import { FeatureManager } from "./core/feature-manager";
import { logger } from "./core/logger";
import { SettingsStore } from "./core/settings-store";
import { StyleRegistry } from "./core/style-registry";
import { features } from "./features";
import { createSettings } from "./ui/settings";
import settingsCSS from "./ui/settings.css";

export interface SpicedRuntime {
  version: string;
  openSettings(): void;
  dispose(): Promise<void>;
}

export function bootstrap(): SpicedRuntime {
  const log = logger("startup");
  let disposed = false;
  let disposal: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let manager: FeatureManager | undefined;
  let styles: StyleRegistry | undefined;
  let open: (() => void) | undefined;
  let removeMenu: (() => void) | undefined;
  let settingsElement: HTMLElement | undefined;
  const started = Date.now();

  const onPageHide = () => { void runtime.dispose(); };
  const runtime: SpicedRuntime = {
    version: __VERSION__,
    openSettings: () => {
      if (open && !disposed) open();
      else log.warn("Settings are not ready. Check that Spicetify API exposure is enabled, then reload Spotify.");
    },
    dispose: () => {
      if (disposal) return disposal;
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("pagehide", onPageHide);
      try { removeMenu?.(); } catch (error) { log.warn("Could not remove menu entry", error); }
      if (settingsElement?.isConnected) {
        try { getSpicetify()?.PopupModal?.hide(); } catch { settingsElement.remove(); }
      }
      styles?.dispose();
      disposal = manager?.dispose() ?? Promise.resolve();
      return disposal;
    },
  };

  function initialize(): void {
    if (disposed) return;
    const api = getSpicetify();
    if (!hasSettingsAPI(api) || !document.head || !document.body) {
      if (Date.now() - started >= 30_000) {
        log.error("Spicetify settings APIs were unavailable after 30 seconds. Check expose_apis and reload Spotify to retry.");
        return;
      }
      timer = setTimeout(initialize, 250);
      return;
    }
    try {
      const store = new SettingsStore(api.LocalStorage);
      styles = new StyleRegistry(document);
      styles.inject("settings", settingsCSS);
      const featureManager = new FeatureManager(features, { document, spicetify: api }, store, styles);
      manager = featureManager;
      open = () => {
        try {
          settingsElement = createSettings(featureManager, () => store.getStatus());
          api.PopupModal!.display({ title: "Spiced", content: settingsElement, isLarge: true });
        } catch (error) {
          log.error("Could not open settings", error);
          api.showNotification?.("Spiced settings could not be opened. See the console for details.", true);
        }
      };
      const menu = new api.Menu!.Item("Spiced settings", false, runtime.openSettings, "<svg viewBox='0 0 16 16' fill='currentColor'><path d='M9 0 3 9h4l-1 7 7-10H9z'/></svg>");
      removeMenu = () => menu.deregister();
      menu.register();
      void featureManager.start().catch(error => log.error("Could not start features", error));
      log.debug(`Ready (${__VERSION__})`);
    } catch (error) {
      log.error("Initialization failed", error);
      void runtime.dispose();
    }
  }

  window.addEventListener("pagehide", onPageHide);
  initialize();
  return runtime;
}
