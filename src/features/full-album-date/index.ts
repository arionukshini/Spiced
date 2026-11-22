import { selectors } from "../../compatibility/selectors";
import { logger } from "../../core/logger";
import type { FeatureDefinition } from "../../core/types";
import { formatReleaseDate, readAlbumDate } from "./release-date";

const log = logger("full-album-date");

export const fullAlbumDate: FeatureDefinition = {
  id: "full-album-date",
  name: "Full album date",
  description: "Show release dates like 13th October 2026 in album headers. Partial dates keep their known precision.",
  category: "interface",
  defaultEnabled: false,
  checkSupport({ document }) {
    if (typeof document.defaultView?.MutationObserver !== "function") {
      return { supported: false, reason: "Album header readiness detection is unavailable." };
    }
    return { supported: true };
  },
  async activate(context) {
    const view = context.document.defaultView!;
    const started = Date.now();
    const ready = await new Promise<boolean>((resolve, reject) => {
      let readinessTimer: number | undefined;
      context.onCleanup(() => { view.clearTimeout(readinessTimer); resolve(false); });
      function check() {
        if (context.signal.aborted) { resolve(false); return; }
        const api = context.spicetify;
        const navigationReady = !!api.Platform?.History?.location && typeof api.Platform.History.listen === "function";
        const metadataReady = typeof api.GraphQL?.Request === "function" && !!api.GraphQL.Definitions?.getAlbum;
        if (navigationReady && metadataReady) { resolve(true); return; }
        if (Date.now() - started >= 30_000) {
          reject(new Error(navigationReady ? "Spotify's album metadata API is unavailable. Try Check again after Spotify finishes loading." : "Spotify's page navigation API is unavailable. Try Check again after Spotify finishes loading."));
          return;
        }
        readinessTimer = view.setTimeout(check, 250);
      }
      check();
    });
    if (!ready || context.signal.aborted) return;
    context.addStyle(`${selectors.albumHeaderSeparators}::before { content: none !important; }`);
    const history = context.spicetify.Platform!.History!;
    const graphql = context.spicetify.GraphQL!;
    let revision = 0;
    let currentPath: string | undefined;
    let observer: MutationObserver | undefined;
    let timer: number | undefined;
    let patch: { node: Text; original: string; replacement: string } | undefined;

    function stopWaiting() {
      observer?.disconnect();
      observer = undefined;
      if (timer !== undefined) view.clearTimeout(timer);
      timer = undefined;
    }

    function restore() {
      if (patch && patch.node.data === patch.replacement) patch.node.data = patch.original;
      patch = undefined;
    }

    context.onCleanup(() => {
      ++revision;
      stopWaiting();
      restore();
    });

    const navigate = context.guard(async () => {
      const pathname = history.location.pathname;
      if (pathname === currentPath) return;
      currentPath = pathname;
      const requestRevision = ++revision;
      stopWaiting();
      restore();
      const albumId = /^\/(?:intl-[a-zA-Z-]+\/)?album\/([a-zA-Z0-9]{22})\/?$/.exec(pathname)?.[1];
      if (!albumId) return;

      const uri = `spotify:album:${albumId}`;
      const isCurrent = () => !context.signal.aborted && revision === requestRevision && history.location.pathname === pathname;
      let response: unknown;
      try {
        response = await graphql.Request!(graphql.Definitions!.getAlbum, { uri, locale: "", offset: 0, limit: 1 });
      } catch (error) {
        if (isCurrent()) throw error;
        return;
      }
      if (!isCurrent()) return;
      const date = formatReleaseDate(readAlbumDate(response, uri));
      if (!date) {
        log.warn("No usable release date returned for", uri);
        return;
      }
      if (date.label === date.year) return;

      const apply = () => {
        if (!isCurrent()) return false;
        const element = context.document.querySelector(selectors.albumReleaseDate);
        const node = element?.firstChild;
        if (!element || element.childNodes.length !== 1 || node?.nodeType !== 3 || node.textContent?.trim() !== date.year) return false;
        const text = node as Text;
        patch = { node: text, original: text.data, replacement: date.label };
        text.data = date.label;
        return true;
      };

      if (apply()) return;
      const root = context.document.querySelector(selectors.mainView);
      if (!root) {
        log.warn("Album content container is unavailable; header left unchanged.");
        return;
      }
      observer = new view.MutationObserver(context.guard(() => {
        if (!isCurrent() || apply()) stopWaiting();
      }));
      observer.observe(root, { childList: true, characterData: true, subtree: true });
      timer = view.setTimeout(context.guard(() => {
        stopWaiting();
        log.debug("Album header was not a supported year field within 10 seconds.");
      }), 10_000);
    });

    context.onCleanup(history.listen(() => navigate()));
    navigate();
  },
};
