import { selectors } from "../../compatibility/selectors";
import type { FeatureDefinition } from "../../core/types";

const options = [
  { id: "tv-mode", name: "TV mode", description: "The monitor / TV Mode Display shortcut, when installed.", defaultEnabled: true },
  { id: "whats-new", name: "What’s New", description: "Spotify’s bell for new releases and updates.", defaultEnabled: true },
  { id: "friend-activity", name: "Listening activity", description: "The friends / listening activity shortcut.", defaultEnabled: true },
] as const;

export const hideIcons: FeatureDefinition = {
  id: "hide-icons",
  name: "Hide icons",
  description: "Choose which shortcuts to hide in Spotify’s top bar. Applies whenever those controls are present.",
  category: "interface",
  defaultEnabled: false,
  optionsLabel: "Choose icons",
  options,
  checkSupport: ({ document }) => document.head
    ? { supported: true }
    : { supported: false, reason: "Spotify’s document is not ready for icon visibility styles." },
  activate: context => {
    const selected = options.filter(option => context.options[option.id]).map(option => selectors.headerIcons[option.id]);
    if (selected.length) context.addStyle(`${selected.join(",\n")} { display: none !important; }`);
  },
};
