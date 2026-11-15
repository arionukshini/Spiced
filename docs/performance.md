# Performance and measurement

Spiced's first performance goal is to add very little work to Spotify. No Spotify speed or memory reduction has been measured or claimed for this foundation.

## What an extension can influence

Extensions execute alongside Spotify's code and can modify its interface. Spicetify recommends avoiding polling, debouncing costly work, and cleaning up listeners. These are useful controls over an extension's own overhead. [Official extension guide](https://spicetify.app/docs/development/extensions)

The documented API exposes UI integration, playback events, storage, and other client services. It does not document controls for Spotify's internal caches, garbage collector, process allocation, media decoding, or rendering engine. The conclusion for Spiced is that those internals are outside its supported optimization scope; this is an inference from the documented API surface, not proof that every internal mechanism is inaccessible. [Official API reference](https://spicetify.app/docs/development/api-wrapper)

Hiding an element with CSS does not establish that Spotify stops fetching its data, updating its components, or holding its objects. A visual simplification can be useful without reducing RAM. Treat any stronger claim as an experiment requiring evidence.

## Rules for future snippets

- Keep selectors narrowly scoped. Prefer owned attributes and stable semantic hooks; keep Spotify selectors in the compatibility layer so they can be reviewed after updates.
- Prefer CSS for purely visual changes. Avoid JavaScript repeatedly rewriting styles or DOM nodes.
- Treat large backdrop blurs, filters, layered shadows, and perpetual animations as candidates for measurement, especially on scrolling surfaces. Do not assume that every use is expensive.
- Avoid reading layout and writing styles repeatedly in the same loop. Batch work only when a feature actually needs DOM measurements.
- Subscribe only while enabled. Store the exact callback for removal. Spicetify's documented Player API supports both registration and removal. [Player events](https://spicetify.app/docs/development/api-wrapper/methods/player)
- Prefer meaningful events over timers. Do not subscribe to playback progress for a change that only needs track changes.
- If an observer is unavoidable, observe the smallest useful root and mutation types, coalesce bursts, and disconnect on disable. A permanent observer over the whole document should require a measured reason.
- Register cleanup as resources are acquired, including before initialization might throw. Remove styles, listeners, timers, observers, and references to detached nodes.
- Keep caches bounded and avoid retaining artwork blobs or large response bodies without a concrete need.

These are review criteria for future work, not extra features implemented in this phase.

## Reproducible local check

Enable Spotify's Chromium DevTools with `spicetify enable-devtools`, then open them with **Ctrl+Shift+I**. Available profiling panels depend on the Spotify build. [Official CLI commands](https://spicetify.app/docs/cli/commands)

1. Record Spotify and Spicetify versions, theme, enabled extensions/snippets, machine, and the exact test flow. Use the same playlist, window size, playback state, and warm-up period for every run.
2. Compare a baseline with Spiced absent, Spiced with every feature off, and Spiced with one candidate feature enabled. Temporarily isolate other modifications when investigating a conflict, preserving their configuration.
3. Repeat an identical short flow: idle, open/close settings, navigate, and scroll. Use the Performance panel where available to compare scripting, style/layout, paint work, and long tasks. Record traces and multiple runs instead of one subjective impression.
4. In the Memory panel where available, compare heap snapshots after repeated enable/disable and settings open/close cycles. Inspect retained detached nodes and increasing listener counts. Development-only forced collection can help compare retained heaps; it is not a user-facing optimization.
5. Inspect Task Manager separately if total Spotify memory is the concern. JavaScript heap size and total process working set are different measurements; process memory changes alone cannot identify an extension leak.
6. Disable the candidate and repeat. Confirm its style nodes and subscriptions disappear and its visual effect reverses. Exclude build watchers, verbose console logging, and DevTools overhead when measuring release idle behavior.

Do not report a percentage improvement until repeated comparisons exceed normal variation. Keep the traces, versions, procedure, and limitations with the result.

## Candidates for the next phase

When existing snippets arrive, first identify duplicate rules, broad selectors, recurring DOM scans, permanent observers, and costly visual effects. Migrate and measure one snippet at a time. Remove only demonstrated duplication or unnecessary work; do not introduce cache cleaners, automatic memory purges, or undocumented client patches.

The release foundation should have no recurring feature work while its demonstration is disabled. Development watching and bounded startup readiness checks should be accounted for separately from steady-state extension overhead. Real Spotify performance validation remains a local acceptance check, even when automated lifecycle tests pass.
