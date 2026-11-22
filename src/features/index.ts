import { orangeDemo } from "./orange-demo";
import { snappyControls } from "./snappy-controls";
import { roundAlbumCovers } from "./round-album-covers";
import { hideIcons } from "./hide-icons";
import { circularShadowFix } from "./circular-shadow-fix";
import { spinningCD } from "./spinning-cd";
import { declutterNowPlaying } from "./declutter-now-playing";
import { fullAlbumDate } from "./full-album-date";
import type { FeatureDefinition } from "../core/types";

export const features: readonly FeatureDefinition[] = [orangeDemo, snappyControls, roundAlbumCovers, hideIcons, circularShadowFix, spinningCD, declutterNowPlaying, fullAlbumDate];
