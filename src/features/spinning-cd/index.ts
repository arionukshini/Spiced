import type { FeatureDefinition } from "../../core/types";
import css from "./style.css?raw";

const speeds: Record<string, number> = { fast: 10, normal: 30, slow: 60, gentle: 360 };

export const spinningCD: FeatureDefinition = {
  id: "spinning-cd", name: "Spinning CD artwork",
  description: "Spin circular player artwork. Pauses with playback and respects reduced motion.",
  category: "appearance", defaultEnabled: false,
  choices: [{ id: "speed", name: "Rotation speed", description: "Time for one full turn. Saved even while the feature is off.", defaultValue: "normal",
    values: [{ value: "fast", label: "Fast · 10 seconds" }, { value: "normal", label: "Normal · 30 seconds" }, { value: "slow", label: "Slow · 60 seconds" }, { value: "gentle", label: "Gentle · 360 seconds" }] }],
  checkSupport: ({ document, spicetify }) => {
    if (!document.head || !document.defaultView?.CSS?.supports("rotate", "1turn")) return { supported: false, reason: "This Spotify renderer does not support artwork rotation." };
    const player = spicetify.Player;
    return typeof player?.isPlaying === "function" && typeof player.addEventListener === "function" && typeof player.removeEventListener === "function"
      ? { supported: true } : { supported: false, reason: "Spicetify’s playback events are unavailable. Reload Spotify to retry." };
  },
  activate: context => {
    const root = context.document.documentElement;
    const player = context.spicetify.Player!;
    const update = context.guard(() => {
      let playing = false;
      try { playing = player.isPlaying(); } catch { /* Playback state can arrive after the wrapper APIs. */ }
      root.setAttribute("data-spiced-cd-playing", String(playing));
    });
    context.onCleanup(() => root.removeAttribute("data-spiced-cd-playing"));
    for (const event of ["onplaypause", "songchange"]) {
      player.addEventListener(event, update);
      context.onCleanup(() => player.removeEventListener(event, update));
    }
    update();
    const duration = speeds[context.choices.speed ?? "normal"] ?? 30;
    context.addStyle(`:root { --spiced-cd-duration: ${duration}s; }\n${css}`);
  },
};
