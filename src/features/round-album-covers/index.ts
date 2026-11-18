import type { FeatureDefinition } from "../../core/types";
import css from "./style.css?raw";

export const roundAlbumCovers: FeatureDefinition = {
  id: "round-album-covers",
  name: "Round album covers",
  description: "Circular library, player and playlist-menu artwork, with softly rounded main covers and track thumbnails. Keeps artist and profile images circular.",
  category: "appearance",
  defaultEnabled: true,
  checkSupport: ({ document }) => {
    if (!document.head || !document.defaultView?.CSS?.supports?.("border-radius", "50%")) {
      return { supported: false, reason: "Spotify’s renderer is not ready for rounded artwork styles." };
    }
    return { supported: true };
  },
  activate: ({ addStyle }) => { addStyle(css); },
};
