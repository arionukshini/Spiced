# Architecture

Spiced is a TypeScript extension bundled into one `dist/spiced.js` file. It has no production npm dependencies, network requests, UI framework, or background feature polling. CSS imports are bundled as text and installed through an owned style registry.

The official extension guide still mentions Creator, but the [official Creator repository](https://github.com/spicetify/spicetify-creator) marks it deprecated and recommends using a bundler directly. Spiced uses esbuild with a small project-owned configuration. [Extension development guide](https://spicetify.app/docs/development/extensions)

## Source map

| Location | Responsibility |
| --- | --- |
| `src/main.ts` | Replaces an earlier Spiced runtime safely and exposes the runtime for debugging. |
| `src/runtime.ts` | Waits for required APIs, creates services, registers the settings menu, and disposes the extension. |
| `src/compatibility/` | Narrow types for the APIs actually used and centralized selector hooks. |
| `src/core/types.ts` | Feature contract, categories, status snapshots, and settings interface. |
| `src/core/settings-store.ts` | Validates and persists versioned toggle preferences. |
| `src/core/feature-manager.ts` | Applies desired state, isolates feature errors, and coordinates activation/cleanup. |
| `src/core/resource-scope.ts` | Tracks resources, cancellation, guarded callbacks, and cleanup. |
| `src/core/style-registry.ts` | Owns one style element per logical key and removes it safely. |
| `src/features/` | Feature registry and independent implementations. |
| `src/ui/` | Settings view, shared SVG chili icon, and scoped theme-aware styles. |
| `scripts/` | Build/watch, path discovery, local installation, and application to Spotify. |
| `tests/` | Automated behavior checks using a simulated DOM. |

## Startup and settings integration

Startup waits for documented `Spicetify.Menu.Item` and `Spicetify.PopupModal.display` APIs, plus the document head and body. Readiness checks stop after 30 seconds; once initialized, there is no readiness timer. Missing settings APIs are reported in the console instead of causing an endless polling loop.

The profile menu exposes **Spiced settings**. Spicetify owns the surrounding modal; Spiced supplies its content using native DOM controls. The `spiced-settings` custom element subscribes when attached and unsubscribes in `disconnectedCallback`. Closing or replacing the modal therefore releases its model subscription without a MutationObserver. The global custom-element definition remains registered for reuse.

Settings use semantic labels, keyboard-operable switches, status messages, orange accents, Spotify theme tokens, and explicit fallback colors. A shared SVG chili mark identifies Spiced in the settings header and profile menu. Settings styles are scoped under `.spiced-settings`; Spotify modifications have their compatibility hooks reviewed separately.

Features can declare boolean `options` and an `optionsLabel`. The settings view renders a keyboard-accessible disclosure with labeled checkboxes and a fieldset. Choices remain editable with the master switch off. `SettingsModel.setOption(featureId, optionId, enabled)` saves a choice; an active feature is cleaned up and reactivated with the updated options, while an inactive feature stays inactive.

## Included features

**Round album covers** (`round-album-covers`, Appearance) is the first user-supplied CSS migration and is enabled by default when no saved preference exists. Its stylesheet makes library, player, and playlist-menu artwork circular. Main cards and entity covers use 10 px corners, category artwork 6 px, home shortcuts 4 px, and track thumbnails 3 px. Explicit circle rules preserve artist and profile artwork.

The migration removes generated class hashes, deep positional selectors, and an unrelated navbar margin rule. It also avoids the original broad `.main-image-image` radius rule that could change avatars. Support detection checks renderer readiness and `border-radius` support; it does not treat an unopened menu or absent page as incompatibility. Its selectors still need review when Spotify changes the relevant surfaces.

**Snappier controls** (`snappy-controls`, Interface) is enabled by default when no saved preference exists. Its support check requires the root Encore timing token and CSS support for the capped duration expression. The stylesheet scopes `--encore-shortest-3` to selected semantic control hooks and caps its current 150 ms default at 75 ms, preserving a theme that is already faster. It leaves the 50 ms hover token and the `--encore-shortest-2`/`--encore-shortest-4` loading phases alone. Spiced switches use 60 ms while the feature is active.

The stylesheet applies only under `prefers-reduced-motion: no-preference`. It adds no recurring JavaScript, observers, or event listeners. Disabling removes its owned stylesheet and restores host timings. This improves interaction timing; it does not change Spotify's data loading, process memory, or rendering engine.

**Hide icons** (`hide-icons`, Interface), added in v0.4, is off by default. Its **Choose icons** options are `tv-mode`, `whats-new`, and `friend-activity`, each selected by default. Activation reads `context.options` and builds one stylesheet that removes selected header buttons from layout. The master switch restores all targeted buttons without clearing individual choices. An enabled feature with no selected options needs no stylesheet.

Its version-specific hooks live in `src/compatibility/selectors.ts`: `#fullscreen-tv-button`; the `whats-new-feed-button` test ID with a `main-topBar-buddyFeed` / English `What's New` label fallback; and the `friend-activity-button` test ID with `data-restore-focus-key="buddy_feed"` fallback. Review these after client changes; the label fallback does not cover every locale. A missing control can reflect an optional extension or the current layout, so it does not mark the whole feature unsupported. CSS applies when matching controls appear, with no polling, observers, or DOM edits.

**Orange preview border** (`orange-demo`, Appearance) remains an optional, disabled-by-default demonstration of style ownership. It only changes a preview card inside Spiced's settings.

## Feature lifecycle

Each registered feature has a unique stable ID, metadata, category, default enabled state, optional support check, and activation function. Activation can return cleanup or register cleanup incrementally through its context. Features are independent and do not activate each other.

Optional boolean choices have IDs unique within their feature, names, descriptions, and defaults. The manager validates IDs, publishes their saved values in settings snapshots, and passes a frozen `context.options` record to each activation. Option changes use the same per-feature lifecycle and error isolation as master toggles.

The manager keeps **desired enabled state** separate from actual status: `disabled`, `pending`, `enabled`, `unsupported`, or `error`. A failure or missing capability preserves the user's desired value. The settings panel explains the actual result and offers a manual retry. Turning a feature off immediately aborts its scope and runs registered cleanup, then queues reconciliation of its final status. Different features have independent operation queues.

A resource scope supplies `AbortSignal`, `onCleanup`, `listen`, and `guard`. Cleanup runs in reverse acquisition order and attempts all registered callbacks even if one throws. Guarded callback errors are routed back to the owning feature. Initialization failures clean up resources registered before the failure.

Activation is raced against the scope's abort signal, so disabling or disposing does not wait for a never-settling initializer. A cleanup returned after cancellation runs immediately, and cancelled contexts cannot inject new managed styles. This does not cancel an arbitrary external promise or undo unmanaged side effects: async feature code must still observe cancellation and settle its work. Unguarded callbacks, detached promises, and missing or broken cleanup remain author responsibilities. See [Adding features](adding-features.md) for the authoring contract.

## CSS ownership

`context.addStyle(css)` installs the feature's stylesheet under `feature:<id>`, recorded as `data-spiced-style` on a style element. Repeated injection replaces the same owned element instead of appending duplicates. Ownership tokens prevent an older cleanup from removing a later injection. Settings styles use their own key.

The registry handles insertion and removal, not CSS isolation. Authors must scope rules appropriately and avoid conflicting declarations. A feature should normally combine its CSS in one import and call `addStyle` once. When disabled, its stylesheet is removed without restarting Spotify.

## Persistence

Preferences are stored through documented `Spicetify.LocalStorage` under the namespaced key `spiced:settings`:

```json
{"version":1,"features":{"round-album-covers":true,"snappy-controls":true,"orange-demo":false,"hide-icons":false,"hide-icons.tv-mode":true,"hide-icons.whats-new":true,"hide-icons.friend-activity":true}}
```

This storage is account-generic within the client, not synchronized across devices or isolated per Spotify account. Spicetify documents that account-specific storage is a different API. [LocalStorage reference](https://spicetify.app/docs/development/api-wrapper/methods/local-storage)

Schema 1 retains its boolean feature map and adds an optional string `choices` map for enumerated settings such as `spinning-cd.speed`. Allowed choices are validated against feature metadata, and invalid saved choices use defaults. Master preferences use the feature ID; options use `<feature-id>.<option-id>` keys in the same boolean map. Existing preferences are preserved, with no migration or reset. Unknown keys are retained, nonboolean values are ignored, and absent values fall back to feature or option defaults. Unsupported schema versions are preserved and remain read-only. Storage failures leave settings usable for the current session and show an explicit persistence message. A successful later toggle retries a normal failed save.

## Build and validation boundaries

TypeScript runs before release builds. esbuild produces a minified browser IIFE; watch builds include inline source maps and development logs. The development installer copies only successful bundles. `npm run local:install` only builds and copies; `npm run local:apply` also registers Spiced and runs Spicetify's normal apply/restart workflow while preserving other registrations. Changes should be applied and tested in Spotify, not left only in the source tree.

`npm run preview` builds the extension and starts a browser preview using a mock Spicetify host. It is useful for checking settings layout and controls, but does not establish integration with the real Spotify client or its modal implementation.

Automated tests validate core lifecycle and settings behavior in a simulated environment. They do not establish compatibility with every Spotify release, theme, or other extension. Native modal behavior, theme integration, persistence after a real Spotify restart, and performance traces still require local acceptance testing. [Performance guidance](performance.md)

## Artwork effects (v0.5)

`circular-shadow-fix` and `spinning-cd` are independent, opt-in Appearance features. Both use current cover-art wrapper hooks, with `.main-nowPlayingView-coverArtContainer` as a fallback when testing attributes are missing. The CD feature animates images with CSS `rotate` so Spotify's wrapper layout transforms remain intact. The artwork stays unobstructed, with no centre overlay. Playback uses the documented [Player events](https://spicetify.app/docs/development/api-wrapper/methods/player) with `onplaypause` and `songchange` subscriptions; cleanup removes that subscription, its owned root state attribute, and CSS. No progress events, observers, or polling are needed. The effect is static under reduced motion and is unavailable when the required playback APIs or CSS rotate support are missing. It does not restyle all player buttons or animate unrelated images.
