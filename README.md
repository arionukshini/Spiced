# Spiced

A better Spotify, one tweak at a time.

Spiced is a lightweight, modular quality-of-life extension for Spotify through Spicetify. It brings independently controlled CSS snippets and small enhancements into one maintainable extension, with orange accents and a settings panel that follows Spotify's theme.

Spiced includes **Snappier controls** and **Round album covers**, plus optional artwork effects, header icon controls, and **Declutter Now Playing**. Every feature has its own persistent switch. Declutter includes individual choices for seven sidebar cards and placeholders. The optional **Orange preview border** demonstration remains off by default.

## Foundation

- Native Spicetify profile-menu entry and settings modal with a shared SVG chili icon.
- Keyboard-accessible switches, visible status messages, light/dark theme colors, and reduced-motion support.
- Persistent, versioned preferences with explicit warnings when saving fails.
- Independent feature activation, compatibility checks, cancellation, and cleanup.
- Owned, deduplicated styles removed immediately when disabled.
- Strict TypeScript, esbuild, development source maps, and no runtime npm dependencies.

Spiced does not promise to reduce Spotify's internal RAM usage. The focus is small extension overhead and measurable changes. Read [Performance and measurement](docs/performance.md) before evaluating optimizations.

## Included features

| Feature | Category | Default | Effect |
| --- | --- | --- | --- |
| Round album covers | Appearance | On | Circular library, player, and playlist-menu artwork, with softly rounded main covers and thumbnails. |
| Snappier controls | Interface | On | Shorter selected control transitions while preserving hover and loading timing. |
| Declutter Now Playing | Interface | Off | Individually hide Credits, About the artist, Related music videos, On tour, Lyrics, Next in queue, and loading placeholders. |
| Hide icons | Interface | Off | Hide selected TV mode, What’s New, and Listening activity header shortcuts. |
| Circular artwork shadow fix | Appearance | Off | Remove square shadows around circular player artwork. |
| Spinning CD artwork | Appearance | Off | Circular artwork with playback-aware rotation and four speeds. |
| Orange preview border | Appearance | Off | A removable CSS demonstration inside Spiced settings. |

## Build on Windows

Install Node.js **22.16 or newer**. Building and testing work without Spotify; applying the extension locally requires a compatible Spicetify/Spotify desktop installation. Run these commands in PowerShell from this project directory:

```powershell
npm ci
npm run check
```

`check` runs strict type checking, lifecycle/UI tests, and a release build. The standalone output is `dist\spiced.js`; CSS is included in that file. For subsequent release builds, use `npm run build`.

Creator was evaluated before choosing the build system. Although the extension guide still mentions it, the [official Creator repository](https://github.com/spicetify/spicetify-creator) marks it deprecated. Spiced uses esbuild directly instead. Research baseline: November 15, 2026.

## Install locally

```powershell
npm run local:apply
```

This builds, copies, registers, and applies Spiced, including Spotify's normal restart. Use it after changes so the installed client runs the version being tested. Existing extension registrations are preserved.

The installer finds the active configuration using `spicetify -c` and copies the bundle into the adjacent `Extensions` directory, normally `%APPDATA%\spicetify\Extensions`. For a copy-only build without registration or restart, use `npm run local:install`.

For a custom directory or an isolated installation test:

```powershell
$env:SPICED_EXTENSIONS_DIR = 'D:\MySpicetify\Extensions'
npm run local:install
Remove-Item Env:\SPICED_EXTENSIONS_DIR
```

This override controls the copy destination; make sure it matches the configuration you later activate. To install manually, copy `dist\spiced.js` into your custom `Extensions` folder, then run `spicetify config extensions spiced.js` and `spicetify apply`.

Open Spotify's **profile menu → Spiced settings**. Under **Interface**, **Snappier controls** is on by default unless you have saved a different preference. It caps the selected controls' normal Encore transition token at 75 ms, compared with Spotify's current 150 ms default. Existing 50 ms hover feedback remains unchanged, and Spiced's switches use 60 ms. The feature respects reduced-motion preferences and can be disabled immediately.

**Hide icons** starts off. Open **Choose icons** to select **TV mode**, **What’s New**, and **Listening activity**; all three choices start selected. The master switch applies those choices, and turning it off restores the controls without forgetting your selections. You can adjust choices while it is off. Changes apply live and persist across restarts. TV mode is available only when its shortcut is installed; absent controls are harmless. Compatibility hooks are version-specific and may need updating after Spotify changes.

Under **Appearance**, **Round album covers** makes library, player, and playlist-menu artwork circular. Main covers use a 10 px radius, category artwork 6 px, home shortcuts 4 px, and track thumbnails 3 px. Artist and profile images retain their circular shape. Disabling removes Spiced's styles immediately. Another active snippet can still apply the same rounding, so disable the matching Marketplace snippet when using the migrated version.

Enable **Orange preview border** to try the small CSS demonstration. Each feature owns its injected stylesheet, which is removed when disabled. Settings persist across Spotify restarts through `Spicetify.LocalStorage`; they are local to the client and shared across accounts on that client, rather than synchronized to Spotify.

To unregister Spiced:

```powershell
spicetify config extensions spiced.js-
spicetify apply
```

Unregistering preserves preferences. Spiced never clears other extensions' storage.

Both new artwork effects are under **Appearance** and start off. **Spinning CD artwork** has a **Rotation speed** selector: 10, 30 (default), 60 or 360 seconds per turn. It targets the current bottom-player and Now Playing artwork wrappers, pauses with playback, and keeps a static CD when reduced motion is requested. Speed changes apply live. **Circular artwork shadow fix** is independent of both spinning and Round album covers.

**Declutter Now Playing** is under **Interface → Choose what to hide**. Its master starts off; the initial choices hide Credits, About the artist, Related music videos, On tour, and loading placeholders while retaining Lyrics and Next in queue. Each choice saves independently and applies live when the master is on. It affects only the Now Playing sidebar, including compatible lyrics extension cards. Artwork, track details, player controls and the actual playback queue remain available. The old snippets' generated layout classes and forced full-height centring are deliberately omitted.

## Development and debugging

After initial activation, use two PowerShell terminals:

```powershell
# Terminal 1: rebuild and copy successful development bundles
npm run dev
```

```powershell
# Terminal 2: let Spicetify refresh Spotify when the installed file changes
spicetify watch -e
```

Development builds include inline source maps and `[Spiced:*]` debug messages. Watch mode does not run TypeScript checking on every edit; run `npm run check` before accepting changes. Failed bundle builds preserve the previous installed file. Toggles apply live; editing extension source uses Spicetify's reload workflow.

Use `npm run watch` to build without copying into Spicetify. To inspect settings without Spotify, run `npm run preview` and open [the local harness](http://127.0.0.1:8137). The harness uses the actual bundle with mock menu, modal, and storage APIs, plus a theme selector. It is a development aid, not proof of native Spotify compatibility. Press Ctrl+C to stop.

Enable Spotify DevTools with `spicetify enable-devtools`, then press **Ctrl+Shift+I**. Console helpers:

```js
window.Spiced.version
window.Spiced.openSettings()
await window.Spiced.dispose()
```

`dispose()` releases Spiced's resources without erasing preferences. Reload Spotify to start it again. In DevTools, inspect `style[data-spiced-style]`; settings have their own style and each feature injects at most one additional stylesheet. Hide icons needs no stylesheet when all icon choices are off.

If the menu is missing, inspect `[Spiced:startup]` errors and check that `expose_apis` is enabled in Spicetify. After correcting configuration, run `spicetify apply` and reload. Startup checks stop after 30 seconds. Missing storage leaves settings usable for the session with a visible warning. Unsupported features show their reason and a recheck action; failed features offer a retry without stopping others.

## Adding more snippets

Each feature lives in `src/features/<id>/`, exports metadata and activation logic, and is registered in `src/features/index.ts`. The settings row, persistent preference, error state, and lifecycle come from the shared foundation.

Read [Adding snippets and features](docs/adding-features.md) for the complete contract, CSS example, cleanup rules, compatibility checks, migration checklist, and instructions for deleting the demonstration. Disable the matching Marketplace snippet when testing its migrated version to avoid duplicate rules.

The [architecture overview](docs/architecture.md) explains the runtime, settings storage, stylesheet ownership, cancellation, and practical limits of error isolation. Compatibility selectors and narrow Spicetify API types live in `src/compatibility/`.

## GitHub and contributions

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow. GitHub Actions runs type checking, tests, and a build on Windows and Linux for pushes and pull requests. The compiled `spiced.js` is available as the `spiced` artifact in the workflow run; generated bundles stay out of Git. Dependencies and Actions receive weekly Dependabot update checks.

The repository is currently **unlicensed**. No open-source license has been selected, and npm publication is disabled with `private: true`.

## Validation

`npm run check` covers preference validation and recovery, storage failures, feature options, CSS insertion/removal, rapid toggles, asynchronous cancellation, partial initialization failures, cleanup errors, guarded events, settings accessibility/focus, modal subscription cleanup, runtime restart restoration, and bounded startup.

Automated checks and the browser harness use simulated APIs. After applying a change, test it in the actual Spotify installation:

1. The profile menu opens Spiced and keyboard focus remains usable when opening/closing settings.
2. Snappier controls applies and reverts its transition timings, with fast hover feedback and loading animation timing preserved.
3. Round album covers applies and reverts the intended radii across library, player, cover, and menu surfaces while artist/profile images stay circular.
4. Hide icons removes only the selected header shortcuts, restores each when deselected, and restores all when the master switch is off. Other header and player controls remain usable.
5. The demo's border appears/disappears and no feature creates duplicate stylesheets.
6. A Spotify restart restores the selected toggle states and individual icon choices.
7. Your light and dark themes keep text, focus indicators, and switches readable; reduced motion stays respected.
8. Other extensions and Marketplace snippets continue to work with Spiced.

The tested native versions and any outstanding acceptance checks are recorded in [Validation notes](docs/validation.md). No internal Spotify memory or rendering performance improvement is claimed.

## Roadmap

1. **Foundation:** maintain the small runtime, settings UI, lifecycle, and tests in this release.
2. **Snippet intake:** continue reviewing supplied snippets one at a time, documenting their behavior and conflicts, and evaluating them behind independent toggles before choosing defaults.
3. **Compatibility:** record supported surfaces and test each migrated feature against Spotify updates and your themes.
4. **Performance:** profile modifications with recurring work or costly visual effects and retain reproducible evidence.
5. **Distribution:** consider Marketplace packaging and release automation once the initial migrations are stable.

## Official references

- [Extension development](https://spicetify.app/docs/development/extensions)
- [Menu API](https://spicetify.app/docs/development/api-wrapper/classes/menu)
- [PopupModal API](https://spicetify.app/docs/development/api-wrapper/methods/popup-modal)
- [LocalStorage API](https://spicetify.app/docs/development/api-wrapper/methods/local-storage)
- [CLI commands](https://spicetify.app/docs/cli/commands)
