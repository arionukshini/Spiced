import { selectors } from "../../compatibility/selectors";
import type { FeatureDefinition } from "../../core/types";

const css = `
@media (prefers-reduced-motion: no-preference) {
  :root {
    --spiced-control-duration: min(var(--encore-shortest-3, 150ms), 75ms);
  }

  ${selectors.motionControls} {
    --encore-shortest-3: var(--spiced-control-duration);
  }

  .spiced-settings .spiced-switch-track,
  .spiced-settings .spiced-switch-track::after {
    transition-duration: 60ms;
  }
}
`;

export const snappyControls: FeatureDefinition = {
  id: "snappy-controls",
  name: "Snappier controls",
  description: "Quicker button, tab and menu feedback: standard 150 ms transitions take 75 ms. Loading and playback animations keep their timing.",
  category: "interface",
  defaultEnabled: true,
  checkSupport: ({ document }) => {
    const view = document.defaultView;
    if (!document.head || !view?.CSS?.supports?.("transition-duration", "min(75ms, 150ms)")) {
      return { supported: false, reason: "This Spotify renderer does not support the required CSS timing values." };
    }
    if (!view.getComputedStyle(document.documentElement).getPropertyValue("--encore-shortest-3").trim()) {
      return { supported: false, reason: "Spotify’s Encore timing token is unavailable. This client or theme is not supported." };
    }
    return { supported: true };
  },
  activate: ({ addStyle }) => { addStyle(css); },
};
