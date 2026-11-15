# Foundation validation

Validated on November 15, 2026, using Windows, Node.js 22.16.0 and npm 10.9.2.

## Automated checks

`npm run check` passes strict TypeScript checking, 21 tests across three files, and the production esbuild build. The release bundle is approximately 22 KiB with no runtime npm dependencies. `npm install` reported no known dependency vulnerabilities at validation time.

The tests exercise persistent state and invalid data, storage failures, stylesheet ownership, rapid toggles, cancellation of pending and never-settling initialization, cleanup after partial failures, guarded events, compatibility rechecks, accessible controls, focus preservation, modal subscription release, runtime restart restoration, and bounded startup waiting.

## Browser review

The actual production bundle was exercised in Chromium through `npm run preview`, using mock Spicetify menu/modal/storage APIs. Dark, light, and narrow settings layouts were visually reviewed. The 400px viewport had no horizontal page overflow. Enabling the demo produced one feature stylesheet and an orange preview border; disabling removed the stylesheet and restored the transparent border. Keyboard toggling, closing/reopening the modal, and saved preferences were also exercised. Concurrent bundle reinjection left one menu item, one settings stylesheet, and one enabled-demo stylesheet. These checks validate Spiced behavior, not Spotify's implementation of the host APIs.

Local, ignored screenshots are available at `output/playwright/settings-dark.png`, `output/playwright/settings-light.png`, and `output/playwright/settings-narrow.png` after this development session; these are harness previews, not Spotify screenshots. Development watch mode was also smoke-tested with an isolated installation directory and inline source maps; the release build was restored afterward.

## Local installation

Detected Spicetify **2.46.7** and a configured Spotify backup version of **1.3.4.258.gc60b10b0946a**. The release bundle was copied to the active configuration's custom `Extensions` directory, registered as `spiced.js`, and applied successfully using `spicetify apply -n`. The applied extension file exists under Spotify's `Apps/xpui/extensions/`. The installed and release bundle SHA-256 hashes match. Existing extension registrations were preserved. Spotify was not running and was not launched or restarted.

The pre-install configuration was retained locally at `artifacts/config-before-spiced.ini` (ignored by Git). Normal removal uses the documented `spicetify config extensions spiced.js-` command followed by `spicetify apply`.

## Remaining native acceptance checks

The desktop UI automation runtime failed to initialize with `failed to write kernel assets: The system cannot find the path specified`. Consequently the native profile menu, native modal/focus behavior, theme integration, and preference restoration after an actual Spotify restart have not been observed. Open Spotify and use **profile menu → Spiced settings** to perform the README's acceptance checklist.

Performance comparisons, native memory profiling, long sessions, and compatibility with future Spotify updates or every installed modification remain untested. No internal Spotify performance improvement is claimed.
