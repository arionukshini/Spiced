import { selectors } from "../../compatibility/selectors";
import type { FeatureDefinition } from "../../core/types";

const options = [
  { id: "credits", name: "Credits", description: "The song’s artists, producers and writers card.", defaultEnabled: true },
  { id: "artist", name: "About the artist", description: "The artist biography and follow card.", defaultEnabled: true },
  { id: "videos", name: "Related music videos", description: "The recommended music video carousel.", defaultEnabled: true },
  { id: "tour", name: "On tour", description: "Upcoming concerts and tour dates for the artist.", defaultEnabled: true },
  { id: "lyrics", name: "Lyrics", description: "Spotify’s lyrics card and compatible lyrics extension cards in this panel.", defaultEnabled: false },
  { id: "queue", name: "Next in queue", description: "The next-track preview card. Your playback queue is unchanged.", defaultEnabled: false },
  { id: "loading", name: "Loading placeholders", description: "Skeleton cards and compatible lyrics loading placeholders in this panel.", defaultEnabled: true },
] as const;

export const declutterNowPlaying: FeatureDefinition = {
  id: "declutter-now-playing", name: "Declutter Now Playing",
  description: "Hide selected cards in the Now Playing sidebar. Artwork, track details and player controls stay available.",
  category: "interface", defaultEnabled: false, optionsLabel: "Choose what to hide", options,
  checkSupport: ({ document }) => document.head && document.defaultView?.CSS?.supports("selector(:has(*))")
    ? { supported: true }
    : { supported: false, reason: "This Spotify renderer cannot safely target individual Now Playing cards." },
  activate: context => {
    const selected = options.filter(option => context.options[option.id]);
    if (!selected.length) return;
    const targets = selected.map(option => `#Desktop_PanelContainer_Id :is(${selectors.nowPlayingCards[option.id]})`);
    context.addStyle(`${targets.join(",\n")} { display: none !important; }`);
  },
};
