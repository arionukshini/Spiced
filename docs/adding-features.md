# Adding snippets and features

Add existing snippets one at a time after reviewing their purpose, selectors, dependencies, and cleanup. Keep each migrated feature disabled by default. Disable its matching Marketplace snippet before enabling the Spiced version so duplicate rules do not hide conflicts or make removal appear broken.

No snippets have been migrated in this foundation. The only feature is a harmless border on a Spiced-owned preview card.

## Start with the existing CSS example

The feature contract lives in `src/core/types.ts`. The existing `src/features/orange-demo/index.ts` shows the complete metadata and CSS activation pattern:

```ts
import type { FeatureDefinition } from "../../core/types";
import css from "./style.css";

export const orangeDemo: FeatureDefinition = {
  id: "orange-demo",
  name: "Orange preview border",
  description: "Add an orange border to the preview below. A small example to try the toggle system.",
  category: "appearance",
  defaultEnabled: false,
  checkSupport: ({ document }) => document.head
    ? { supported: true }
    : { supported: false, reason: "Spotify’s document is not ready for style injection." },
  activate: ({ addStyle }) => { addStyle(css); },
};
```

Its `style.css` is intentionally limited to content Spiced owns:

```css
.spiced-settings [data-spiced-demo] {
  border-color: #f59b53;
}
```

The preview's base settings styles already reserve its border width, so enabling the example changes its color without moving surrounding content.

For a real migration, create a dedicated `src/features/<feature-id>/` directory with `index.ts` and, where appropriate, `style.css`. Choose a unique ID matching `^[a-z][a-z0-9-]*$`; changing an ID later changes its saved-setting identity. Set a clear name and description, choose `appearance`, `interface`, or `behavior`, and keep `defaultEnabled: false` while evaluating the migration.

Import the definition in `src/features/index.ts` and add it to the exported `features` array. The settings view creates its row and persistent toggle automatically. Do not add separate settings state or manually inject style elements.

## Compatibility and CSS scope

Check APIs by capability before using them. Add only the necessary API shape to `src/compatibility/spicetify.ts`, using the [official API reference](https://spicetify.app/docs/development/api-wrapper) and checking the actual supported client. Types document expectations; they do not guarantee an API exists at runtime.

Keep Spotify compatibility selectors and related fallback decisions in `src/compatibility/`. Prefer semantic attributes and stable extension-owned hooks over generated Spotify classes. Spiced's own `.spiced-settings` and `data-spiced-*` selectors are stable contracts; they do not require guessing Spotify's implementation.

An optional `checkSupport(environment)` returns `{ supported: true }` or `{ supported: false, reason: "A useful explanation" }`. Reserve unsupported status for a missing capability or a known incompatible surface. An element absent because its page or modal is closed is not evidence of incompatibility. In particular, the demo checks `document.head`, not whether its preview currently exists: its CSS should remain active when the settings modal is closed and apply when it opens again.

For route-specific work, define the route behavior explicitly. CSS can naturally wait for matching elements. JavaScript should use an appropriate documented event and clean up its subscription; avoid permanent document scans merely to find a page that is not open.

Use a narrow root for each rule and avoid unrelated global overrides or blanket `!important`. CSS injection alone cannot prevent conflicts with themes or Marketplace snippets. The manager owns one style key per feature; combine multiple CSS imports before `addStyle` rather than expecting multiple calls to append separate sheets.

## JavaScript lifecycle and cancellation

`activate(context)` may return `void`, a synchronous cleanup function, or a promise resolving to either. Its context provides:

| API | Use |
| --- | --- |
| `document`, `spicetify` | The feature environment. |
| `addStyle(css)` | Inject feature-owned CSS with automatic removal. |
| `onCleanup(callback)` | Register synchronous release work as soon as a resource is acquired. |
| `listen(target, event, callback)` | Register a DOM `EventTarget` listener with automatic removal and guarded error handling. |
| `guard(callback)` | Wrap external API callbacks so errors mark the feature failed and trigger its cleanup. |
| `signal` | Stop asynchronous work when the feature is disabled or disposed. |

For DOM events, use `listen` rather than a bare `addEventListener`. Spicetify emitters are not necessarily DOM `EventTarget` objects: wrap their callback with `guard`, register it using their documented API, and use `onCleanup` to remove that exact callback. Apply the same ownership rule to timers and narrowly scoped observers.

Register cleanup incrementally, before a later operation can throw. A cleanup function returned at the end of activation cannot release an earlier resource if activation fails before returning it. Keep cleanup idempotent and synchronous. If it throws, the scope still attempts its other cleanup callbacks, but the failed external effect may remain until reload or manual recovery.

Pass `signal` to cancellable operations such as `fetch`; check `signal.aborted` after awaited work before changing the DOM or acquiring another resource. Handle expected cancellation locally. Guarded callbacks skip new calls after cancellation, but cannot interrupt a callback already running. Async authors should ensure their work resolves or rejects after cancellation rather than leaving promises waiting for events that disabling has removed.

Disabling immediately disposes the feature's current scope. The manager races activation against cancellation, so an initializer that never settles does not block disable or extension disposal. A cleanup returned later is executed immediately and late `addStyle` calls are ignored. These safeguards cannot terminate arbitrary external work, release resources that were never registered, or prevent unmanaged DOM changes from code that ignores `signal`.

Unsupported and failed features retain their saved desired toggle value. **Check again** or **Try again** requests another reconciliation, including cleanup of the current scope before activation. Retry cannot undo side effects whose cleanup failed, and it does not catch arbitrary unguarded external callbacks or detached asynchronous work. Use the lifecycle helpers consistently.

## Validate each migration

Run `npm run check`, then install and test the candidate in Spotify. Verify enable/disable repeatedly, navigation away and back, closing/reopening settings, persistence after restart, light and dark themes, and the missing-capability message. Confirm the matching `style[data-spiced-style="feature:<id>"]` element appears once when enabled and disappears when disabled.

For JavaScript changes, test partial activation failure, callback failure, cancellation during initialization, and listener/observer removal. Profile only when the change introduces meaningful recurring work or expensive visual effects; use the repeatable procedure in [Performance and measurement](performance.md).

## Remove the demonstration

Remove the `orangeDemo` import and array entry from `src/features/index.ts`, then remove `src/features/orange-demo/`. The old stored preference is harmless and need not be deleted.

Optionally remove the demo preview creation block in `src/ui/settings.ts`, its preview-specific rules in `src/ui/settings.css`, and the unused `demoPreview` compatibility selector. Update tests that intentionally refer to the demonstration. Keep the general feature system, persistence, settings controls, and orange branding.
