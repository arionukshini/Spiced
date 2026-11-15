import type { FeatureDefinition } from "../../core/types";
import css from "./style.css";

export const orangeDemo: FeatureDefinition = {
  id: "orange-demo",
  name: "Orange preview border",
  description: "Add an orange border to the preview below. A small example to try the toggle system.",
  category: "appearance",
  defaultEnabled: false,
  checkSupport: ({ document }) => document.head
    ? { supported: true }
    : { supported: false, reason: "Spotify’s document is not ready for style injection." },
  activate: ({ addStyle }) => { addStyle(css); },
};
