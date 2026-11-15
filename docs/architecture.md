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
| `src/ui/` | Settings view and scoped theme-aware styles. |
| `scripts/` | Build/watch, path discovery, and local file installation. |
| `tests/` | Automated behavior checks using a simulated DOM. |

## Startup and settings integration

Startup waits for documented `Spicetify.Menu.Item` and `Spicetify.PopupModal.display` APIs, plus the document head and body. Readiness checks stop after 30 seconds; once initialized, there is no readiness timer. Missing settings APIs are reported in the console instead of causing an endless polling loop.

The profile menu exposes **Spiced settings**. Spicetify owns the surrounding modal; Spiced supplies its content using native DOM controls. The `spiced-settings` custom element subscribes when attached and unsubscribes in `disconnectedCallback`. Closing or replacing the modal therefore releases its model subscription without a MutationObserver. The global custom-element definition remains registered for reuse.

Settings use semantic labels, keyboard-operable switches, status messages, orange accents, Spotify theme tokens, and explicit fallback colors. Styles are scoped under `.spiced-settings`; future Spotify modifications should have their compatibility hooks reviewed separately.

## Feature lifecycle

Each registered feature has a unique stable ID, metadata, category, default enabled state, optional support check, and activation function. Activation can return cleanup or register cleanup incrementally through its context. Features are independent and do not activate each other.

The manager keeps **desired enabled state** separate from actual status: `disabled`, `pending`, `enabled`, `unsupported`, or `error`. A failure or missing capability preserves the user's desired value. The settings panel explains the actual result and offers a manual retry. Turning a feature off immediately aborts its scope and runs registered cleanup, then queues reconciliation of its final status. Different features have independent operation queues.

A resource scope supplies `AbortSignal`, `onCleanup`, `listen`, and `guard`. Cleanup runs in reverse acquisition order and attempts all registered callbacks even if one throws. Guarded callback errors are routed back to the owning feature. Initialization failures clean up resources registered before the failure.

Activation is raced against the scope's abort signal, so disabling or disposing does not wait for a never-settling initializer. A cleanup returned after cancellation runs immediately, and cancelled contexts cannot inject new managed styles. This does not cancel an arbitrary external promise or undo unmanaged side effects: async feature code must still observe cancellation and settle its work. Unguarded callbacks, detached promises, and missing or broken cleanup remain author responsibilities. See [Adding features](adding-features.md) for the authoring contract.

## CSS ownership

`context.addStyle(css)` installs the feature's stylesheet under `feature:<id>`, recorded as `data-spiced-style` on a style element. Repeated injection replaces the same owned element instead of appending duplicates. Ownership tokens prevent an older cleanup from removing a later injection. Settings styles use their own key.

The registry handles insertion and removal, not CSS isolation. Authors must scope rules appropriately and avoid conflicting declarations. A feature should normally combine its CSS in one import and call `addStyle` once. When disabled, its stylesheet is removed without restarting Spotify.

## Persistence

Preferences are stored through documented `Spicetify.LocalStorage` under the namespaced key `spiced:settings`:

```json
{"version":1,"features":{"orange-demo":false}}
```

This storage is account-generic within the client, not synchronized across devices or isolated per Spotify account. Spicetify documents that account-specific storage is a different API. [LocalStorage reference](https://spicetify.app/docs/development/api-wrapper/methods/local-storage)

Unknown feature IDs are retained, nonboolean values are ignored, and absent values fall back to feature defaults. Unsupported schema versions are preserved and remain read-only. Storage failures leave settings usable for the current session and show an explicit persistence message. A successful later toggle retries a normal failed save.

## Build and validation boundaries

TypeScript runs before release builds. esbuild produces a minified browser IIFE; watch builds include inline source maps and development logs. The development installer copies only successful bundles and does not change other extension registrations.

`npm run preview` builds the extension and starts a browser preview using a mock Spicetify host. It is useful for checking settings layout and controls, but does not establish integration with the real Spotify client or its modal implementation.

Automated tests validate core lifecycle and settings behavior in a simulated environment. They do not establish compatibility with every Spotify release, theme, or other extension. Native modal behavior, theme integration, persistence after a real Spotify restart, and performance traces still require local acceptance testing. [Performance guidance](performance.md)
