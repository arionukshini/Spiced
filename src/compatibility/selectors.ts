export const selectors = {
  demoPreview: ".spiced-settings [data-spiced-demo]",
  motionControls: ["button", "buttonPrimary", "buttonSecondary", "buttonTertiary", "buttonIcon", "tabItem", "menuRow", "formToggle", "textLink"]
    .map(id => `[data-encore-id="${id}"]`).join(",\n"),
  headerIcons: {
    "tv-mode": "#fullscreen-tv-button",
    "whats-new": `button[data-testid="whats-new-feed-button"], button.main-topBar-buddyFeed[aria-label="What's New" i]`,
    "friend-activity": `button[data-testid="friend-activity-button"], button[data-restore-focus-key="buddy_feed"]`,
  },
} as const;
