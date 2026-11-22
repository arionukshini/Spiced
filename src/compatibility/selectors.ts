export const selectors = {
  albumReleaseDate: '[data-testid="album-page"] [data-testid="release-date"]',
  albumHeaderSeparators: '[data-testid="album-page"] .main-entityHeader-metaData > [data-separator="true"]:not(:empty)',
  mainView: ".main-view-container",
  demoPreview: ".spiced-settings [data-spiced-demo]",
  motionControls: ["button", "buttonPrimary", "buttonSecondary", "buttonTertiary", "buttonIcon", "tabItem", "menuRow", "formToggle", "textLink"]
    .map(id => `[data-encore-id="${id}"]`).join(",\n"),
  headerIcons: {
    "tv-mode": "#fullscreen-tv-button",
    "whats-new": `button[data-testid="whats-new-feed-button"], button.main-topBar-buddyFeed[aria-label="What's New" i]`,
    "friend-activity": `button[data-testid="friend-activity-button"], button[data-restore-focus-key="buddy_feed"]`,
  },
  nowPlayingCards: {
    credits: ".main-nowPlayingView-credits, section:has(> .main-nowPlayingView-credits), .main-nowPlayingView-section:has(.main-nowPlayingView-creditsHeader)",
    artist: ".main-nowPlayingView-aboutArtist, .main-nowPlayingView-aboutArtistV2",
    // Current XPUI fallbacks for cards without named hooks; review after client updates.
    videos: '.main-nowPlayingView-section:has([aria-label="Related music videos" i]), .main-nowPlayingView-section.l5YdKPM8Ayc0mg7Zy6Gg',
    tour: ".main-nowPlayingView-section.nhcTY9t3aA49TPoP8ok4",
    lyrics: '#SpicyLyricsNPVCard, [data-testid="lyrics-npv-section"], .lyrics-npv-card, .LoadingLyricsCard, section:has(> .lyrics-npv-card)',
    queue: ".main-nowPlayingView-queue, section:has(> .main-nowPlayingView-queue)",
    loading: '[data-testid="skeleton-section"], .Loading, .LoadingLyricsCard',
  },
} as const;
