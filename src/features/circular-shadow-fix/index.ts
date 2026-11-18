import type { FeatureDefinition } from "../../core/types";
import css from "./style.css?raw";

export const circularShadowFix: FeatureDefinition = {
  id: "circular-shadow-fix", name: "Circular artwork shadow fix",
  description: "Remove square shadows around circular player artwork and clip its edges cleanly.",
  category: "appearance", defaultEnabled: false,
  checkSupport: ({ document }) => document.head ? { supported: true } : { supported: false, reason: "Spotify’s document is not ready." },
  activate: ({ addStyle }) => { addStyle(css); },
};
