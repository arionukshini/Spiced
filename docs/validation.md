# Validation record

This record covers **Spiced v0.3.0** on Windows. Automated, browser-harness, and native Spotify results are listed separately. The build and apply checks below were performed on **November 16, 2026**; native toggle and restart-persistence checks were completed on **November 17, 2026**.

## Automated checks

`npm run check` passed strict TypeScript checking, **32 tests across five files**, and the production esbuild build. The release bundle is **27,632 bytes (27.0 KiB)** with **zero runtime npm dependencies**.

Coverage includes persistent preferences and malformed data, storage failure reporting, stylesheet ownership, rapid toggles, pending and never-settling initialization cancellation, partial-failure cleanup, guarded callbacks, compatibility rechecks, accessible settings controls, focus preservation, subscription release, runtime restoration, and bounded startup waiting. Feature tests cover Snappier controls and Round album covers, including independent stylesheet removal, saved disabled preferences, and unavailable CSS capabilities.

The test configuration processes `style.css?raw` imports correctly. The Round album covers test checks the resulting computed **10px** radius on a main artwork fixture rather than relying only on stylesheet text or node existence.

## Browser harness

The production bundle was exercised in Chromium through `npm run preview`, using mock Spicetify menu, modal, and storage APIs. These results establish behavior in the browser fixture; they do not establish native Spotify behavior.

### Snappier controls

| Probe | Observed result |
| --- | --- |
| Standard control transition | 150ms while off; 75ms while on; restored to 150ms after disabling. |
| Already-fast hover transition | 50ms remained unchanged. |
| Theme-supplied fast transition | 40ms remained unchanged. |
| Loading spinner | 1s remained unchanged. |
| Loading dots | 1.32s remained unchanged. |
| Third loading-dot phase delay | 200ms remained unchanged. |
| Spiced switch transition | 120ms while off; 60ms while on. |

These are timing measurements, not evidence of reduced CPU usage, memory consumption, or rendering-engine overhead.

### Round album covers

With the feature on, computed fixture radii were **10px** for main artwork, **50%** for artist, library, player, and playlist-menu images, **4px** for shortcut artwork, and **3px** for track thumbnails. An unrelated pill retained its **999px** radius, and the measured artwork width remained **64px**.

Disabling restored the main-artwork fixture to **0px**, preserved the artist fixture's **50%** radius, and removed the round-cover feature stylesheet. The independent Snappier controls stylesheet remained present: **zero** round-cover stylesheets and **one** Snappier controls stylesheet. Reloading the harness restored the saved enabled choice.

### Layout review and evidence limits

Earlier harness reviews covered dark, light, and 400px-wide settings layouts, keyboard toggling, modal reopening, demo border injection/removal, and bundle reinjection without duplicate menu or style entries. Development watching was smoke-tested against an isolated installation directory, with inline source maps; the release build was restored afterward.

The ignored `output/playwright/` screenshots contain older foundation and v0.2 harness images. They are browser previews, not evidence of the v0.3 artwork changes. Native v0.3 screenshots were inspected during the live checks; no new screenshot artifact was exported.

## Local installation and apply

`npm run local:apply` completed successfully on **November 16, 2026**, installing and registering `spiced.js`, applying it to Spotify, and restarting Spotify through the normal Spicetify apply workflow. Existing extension registrations were preserved.

The release and applied bundle SHA-256 hashes matched:

```text
CE157E12AAC335BBC361C5939BE53FF7D25845B187D959E2A35970B788FEEB10
```

The local environment previously identified Spicetify **2.46.7** and a configured Spotify backup version of **1.3.4.258.gc60b10b0946a**. A backup-version value is not a fresh measurement of the running Spotify version.

The initial pre-Spiced configuration backup remains at the ignored `artifacts/config-before-spiced.ini`. Normal removal uses `spicetify config extensions spiced.js-` followed by `spicetify apply`.

## Native Spotify observations

During the **November 15–16, 2026** native checks, both the profile-menu entry and chili settings button opened Spiced settings in the actual Spotify app. Snappier controls was switched on and off, and saved-state feedback was observed in the native interface.

On **November 16**, circular library/player artwork and softly rounded main artwork were visually observed in Spotify with Round album covers enabled. The **10px** value was measured in the harness and automated fixture; native artwork was reviewed visually.

On **November 17**, the installed v0.3.0 settings panel showed both requested features enabled. Round album covers was disabled in Spotify, which changed library artwork back to square covers. The panel reported **Off**, **1 of 3 features active**, and **All changes saved**, while Snappier controls remained **On**.

Spotify was then fully restarted with `spicetify restart`. Reopening Spiced confirmed that Round album covers was still **Off** despite its enabled-by-default definition, proving restoration of the saved preference. It was then re-enabled. The final native state was **2 of 3 features active**, both Round album covers and Snappier controls **On**, with **All changes saved**. The optional orange border demo remained **Off**.

Player artwork remained circular while Spiced's rounding was disabled, so another existing style or theme also affects that surface. Its exact source was not identified or changed. Spiced removes its own stylesheet; it does not override or remove another customization's artwork rules.

## Validation limits

- Native light/dark theme coverage, full keyboard/focus behavior, long sessions, and compatibility with every installed modification or future Spotify release have not been established by the checks above.
- The playlist-menu and artist-circle cases were measured in fixtures; not every native page or menu was opened during these checks.
- Existing artwork customizations can mask a visual reversal even when Spiced's feature is disabled and cleaned up.

No Spotify internal memory reduction or performance improvement is claimed. Native memory profiling and repeatable performance comparisons remain future measurement work.

## GitHub repository checks — November 17, 2026

Repository preparation adds Windows/Linux CI, a downloadable build artifact, weekly dependency update configuration, contributor templates, and consistent text/editor settings. Ignore rules cover dependencies, generated bundles, test output, local configuration, logs, screenshots, and editor/OS files. No ignored generated files were already tracked, and the candidate-file scan found no credential-like values or personal absolute paths.

A fresh `npm ci` followed by `npm run check` passed local type checking, all **32 tests**, and the build. All three GitHub YAML files parsed successfully, and the repository whitespace check passed. The built bundle still matches the installed bundle hash recorded above. Hosted GitHub Actions has not been executed; the workflow runs after the changes are pushed.

The full npm audit currently reports **five high-severity affected development packages** stemming from the Picomatch advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf). The advisory lists all published versions through 4.0.7 as affected and no patched version as of this check. The dependency is used by Vitest/Vite tooling and is absent from the bundled Spotify extension. `npm audit --omit=dev` reports **zero vulnerabilities**. No forced downgrade or unverified dependency override was applied; Dependabot is configured to check for updates.

The repository remains unlicensed at the owner's request, with `license: "UNLICENSED"` and `private: true` in package metadata.
