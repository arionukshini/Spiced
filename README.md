# Spiced

A better Spotify, one tweak at a time.

Spiced is a lightweight, modular quality-of-life extension for Spotify through Spicetify. It brings independently controlled CSS snippets and small enhancements into one maintainable extension, with orange accents and a settings panel that follows Spotify's theme.

**This is the foundation release.** No existing snippets have been migrated. The only demonstration feature adds an orange border to a preview card inside Spiced's settings and is off by default.

## Foundation

- Native Spicetify profile-menu entry and settings modal.
- Keyboard-accessible switches, visible status messages, light/dark theme colors, and reduced-motion support.
- Persistent, versioned preferences with explicit warnings when saving fails.
- Independent feature activation, compatibility checks, cancellation, and cleanup.
- Owned, deduplicated styles removed immediately when disabled.
- Strict TypeScript, esbuild, development source maps, and no runtime npm dependencies.

Spiced does not promise to reduce Spotify's internal RAM usage. The focus is small extension overhead and measurable changes. Read [Performance and measurement](docs/performance.md) before evaluating optimizations.

## Build on Windows

Install Node.js **22.16 or newer** and a working, compatible Spicetify/Spotify desktop installation. Run these commands in PowerShell from this project directory:

```powershell
npm ci
npm run check
```

`check` runs strict type checking, lifecycle/UI tests, and a release build. The standalone output is `dist\spiced.js`; CSS is included in that file. For subsequent release builds, use `npm run build`.

Creator was evaluated before choosing the build system. Although the extension guide still mentions it, the [official Creator repository](https://github.com/spicetify/spicetify-creator) marks it deprecated. Spiced uses esbuild directly instead. Research baseline: November 15, 2026.

## Install locally

```powershell
npm run local:install
spicetify config extensions spiced.js
spicetify apply
```

The installer finds the active configuration using `spicetify -c` and copies the bundle into the adjacent `Extensions` directory, normally `%APPDATA%\spicetify\Extensions`. It does not register the extension or restart Spotify itself. The `config extensions` command appends Spiced while preserving existing registrations; `apply` can restart Spotify.

For a custom directory or an isolated installation test:

```powershell
$env:SPICED_EXTENSIONS_DIR = 'D:\MySpicetify\Extensions'
npm run local:install
Remove-Item Env:\SPICED_EXTENSIONS_DIR
```

This override controls the copy destination; make sure it matches the configuration you later activate. To install manually, copy `dist\spiced.js` into your custom `Extensions` folder, then run the same two Spicetify commands.

Open Spotify's **profile menu → Spiced settings**. Enable **Orange preview border** and watch the preview card change. Disable it to remove the stylesheet immediately. Settings persist across Spotify restarts through `Spicetify.LocalStorage`; they are local to the client and shared across accounts on that client, rather than synchronized to Spotify.

To unregister Spiced:

```powershell
spicetify config extensions spiced.js-
spicetify apply
```

Unregistering preserves preferences. Spiced never clears other extensions' storage.

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

`dispose()` releases Spiced's resources without erasing preferences. Reload Spotify to start it again. In DevTools, inspect `style[data-spiced-style]`; settings have their own style and the demo has one additional style only while enabled.

If the menu is missing, inspect `[Spiced:startup]` errors and check that `expose_apis` is enabled in Spicetify. After correcting configuration, run `spicetify apply` and reload. Startup checks stop after 30 seconds. Missing storage leaves settings usable for the session with a visible warning. Unsupported features show their reason and a recheck action; failed features offer a retry without stopping others.

## Add your snippets later

Each feature lives in `src/features/<id>/`, exports metadata and activation logic, and is registered in `src/features/index.ts`. The settings row, persistent preference, error state, and lifecycle come from the shared foundation.

Read [Adding snippets and features](docs/adding-features.md) for the complete contract, CSS example, cleanup rules, compatibility checks, migration checklist, and instructions for deleting the demonstration. Disable the matching Marketplace snippet when testing its migrated version to avoid duplicate rules.

The [architecture overview](docs/architecture.md) explains the runtime, settings storage, stylesheet ownership, cancellation, and practical limits of error isolation. Compatibility selectors and narrow Spicetify API types live in `src/compatibility/`.

## Validation

`npm run check` covers preference validation and recovery, storage failures, CSS insertion/removal, rapid toggles, asynchronous cancellation, partial initialization failures, cleanup errors, guarded events, settings accessibility/focus, modal subscription cleanup, runtime restart restoration, and bounded startup.

Automated checks and the browser harness use simulated APIs. In your actual Spotify installation, confirm:

1. The profile menu opens Spiced and keyboard focus remains usable when opening/closing settings.
2. The demo's border appears/disappears and only one feature stylesheet exists when enabled.
3. A Spotify restart restores the selected toggle state.
4. Your light and dark themes keep text, focus indicators, and switches readable.
5. Other extensions and Marketplace snippets continue to work with Spiced.

The tested native versions and any outstanding acceptance checks are recorded in [Validation notes](docs/validation.md). No internal Spotify memory or rendering performance improvement is claimed.

## Roadmap

1. **Foundation:** maintain the small runtime, settings UI, lifecycle, and tests in this release.
2. **Snippet intake:** review your supplied snippets, document their behavior and conflicts, and migrate one at a time behind disabled-by-default toggles.
3. **Compatibility:** record supported surfaces and test each migrated feature against Spotify updates and your themes.
4. **Performance:** profile modifications with recurring work or costly visual effects and retain reproducible evidence.
5. **Distribution:** consider Marketplace packaging and release automation once the initial migrations are stable.

## Official references

- [Extension development](https://spicetify.app/docs/development/extensions)
- [Menu API](https://spicetify.app/docs/development/api-wrapper/classes/menu)
- [PopupModal API](https://spicetify.app/docs/development/api-wrapper/methods/popup-modal)
- [LocalStorage API](https://spicetify.app/docs/development/api-wrapper/methods/local-storage)
- [CLI commands](https://spicetify.app/docs/cli/commands)
