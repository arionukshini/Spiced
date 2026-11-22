# Validation record

## Full album date and album separators — November 20, 2026

After the user authorized testing and application, `npm run check` passed strict TypeScript checking, **68 tests across ten files**, and the production build. The bundle is **44,886 bytes**. New coverage includes ordinal suffixes, calendar validity and partial precision, live restoration, delayed headers, navigation and cancellation, persisted preferences, delayed API readiness, readiness timeout and retry, request failure isolation, and separator style ownership. `git diff --check` passed.

`npm run local:apply` completed successfully, preserving the `spiced.js` and `star-ratings.js` registrations. The built and installed bundles have matching SHA-256 hashes: `03495BE156228E566B1D66BADA380CB02BFCD9E30363AA8BC6000B62FB7F95FD`.

In the actual Spotify desktop client (1.3.4.258, Spicetify 2.46.7), live checks through its developer interface confirmed:

- The saved enabled switch initialized to **On** after a fresh launch without **Check again**. The previous immediate capability check had incorrectly reported a missing History API before Spicetify finished exposing it.
- THE RITUAL (`1mk53meB7tdBgobX5Y2AKx`) displayed **17th November 2026**. Turning the settings switch off restored **2026** and removed its owned style; turning it back on restored the full date and **All changes saved**.
- Navigation to ZapSki (`76pAfxTP9PpVbY3nKm82ho`) displayed **18th November 2026**, matching Spotify's album metadata. Returning to THE RITUAL restored its correct full date, with one owned stylesheet.
- Both header separators retained their actual bullet while their duplicate `::before` content became `none`. The corrected album header was also visually inspected in the native Spotify window.
- The enabled preference survived relaunch. A final normal launch without the temporary developer-debugging flag was visually checked: opening THE RITUAL still showed **17th November 2026** with single separators. Other saved feature choices remained unchanged.

The Chromium browser harness separately verified the fixture's **13th October 2026**, single separators, off/on restoration, and reload persistence. Screenshots confirmed the date in both light and dark themes. These use mock metadata and are not native Spotify tests. Native month-only/year-only metadata and artificially delayed responses were not forced; their handling is covered by automated tests. The records below cover earlier releases.

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

## Artwork effects — v0.5.0

`npm run check` passed strict typing, **50 tests across eight files**, and the production build. The standalone `dist/spiced.js` bundle is **39,614 bytes**, with no runtime npm dependencies. New tests cover speed validation/defaults/persistence, accessible select focus, playback event updates, exact listener cleanup, independent stylesheet removal, missing APIs, and current wrapper fallbacks when testing attributes are absent.

`npm run local:apply` built, copied and applied the extension through Spicetify 2.46.7, preserving registrations. The final release/applied SHA-256 matched: `09CF523CF2BAEB1A5F8AE3E9CA7FEB61C7CB293F951DDA0134EFC25797FCEDB2`.

In the Chromium harness, Fast computed to **10s**, playback changed animation state from **paused** to **running**, the computed rotation angle advanced between observations, and pause stopped it. Reload restored Fast and both enabled choices. Disabling CD removed its animation, hub and stylesheet while the independent shadow-fix stylesheet remained. The shadow fixture computed `box-shadow: none`. Light/dark settings were inspected; a light-theme screenshot is in ignored `output/playwright/v0.5-cd-light.jpg`. These are fixture results, not native measurements.

The new effects are opt-in. Rotation adds continuous visual work while playing; no Spotify RAM or frame-rate improvement is claimed. Native reduced-motion mode, videos/Canvas, every theme, prolonged use and all Spotify surfaces are outside this acceptance run.

Native v0.5 acceptance used the Windows Spotify client (`app.last-launched-version` 1.3.4.258.gc60b10b0946a). Both switches were enabled in Spotify, and the native speed select changed from Normal to Fast with saved feedback. Restarting restored both desired states and Fast. That check exposed an early `Player.isPlaying()` call before playback origin was ready; the final implementation starts paused safely and refreshes on playback/track events. A regression test covers this exact startup sequence.

The final native settings showed **5 of 6 features active**, both new effects **On**, and **Fast · 10 seconds** restored after application/restart. The bottom player and large Now Playing cover both displayed the CD hub. Host pseudo-element blur and sizing initially affected the large hub; the final scoped hub rule explicitly resets those properties. In a corresponding browser fixture, the hub computed to **28.15px** on 128px artwork and `filter: none`, despite a host blur rule.

Native playback was started, artwork orientation visibly changed while the track progressed, and playback was paused again at approximately 0:15. The effects remain enabled at Fast. Native proof is saved in ignored `output/playwright/v0.5-native-cd.png`; this is an actual Spotify capture. Native feature-off cleanup was not separately established in the final acceptance pass; CSS removal and exact event unsubscription were verified in automated tests and the browser harness. No performance profiling is claimed.

## Centre overlay removal — v0.5.1

Removed the CD hub pseudo-element at the user's request. Circular clipping, rotation speeds, playback-aware pause and saved preferences remain. Updated settings copy and feature documentation. `npm run check` passed all **50 tests** and the release build; `npm run local:apply` installed the release. Release and applied SHA-256 matched: `45E2284EC3AF876B9720EB4968CFEC26A9ECE68B13203B329B5B366033130B40`. In the browser fixture the player pseudo-element computed `content: none`, while playback still used `spiced-cd-rotate` with `animation-play-state: running`.

Native Spotify inspection confirmed that both the bottom-player artwork and the loaded large Now Playing artwork show their original image centres without the overlay. Existing feature preferences were preserved.

## Declutter Now Playing — v0.6.0 (November 19, 2026)

`npm run check` passed strict typing, **56 tests across nine files**, and a **40,735-byte** production bundle. Six new feature tests cover independent card choices, current whole-card wrappers, late-rendered content, scoping outside the sidebar, immediate stylesheet cleanup, saved preferences, all choices off, and unsupported selector capabilities. `npm run local:apply` completed; release and applied SHA-256 matched: `67FEFB6CDBBBD349BA9CFF133C4C5801CC6D6D6BC2AC00EB054F057BEDFD602E`.

In Chromium with the mock host, the initial selection hid Credits, About the artist and loading placeholders while keeping Lyrics, Queue, artwork and unrelated loading content visible. Changing Credits, Lyrics and Queue affected their own cards; disabling the master removed the stylesheet and restored all fixture cards. Reload retained the changed choices. Both dark and light settings were inspected. Native results are recorded separately below. No forced centring or generated layout selectors were migrated.

Native v0.6.0 settings exposed the five choices. Next in queue hid correctly during the first pass, but the installed Spicy Lyrics card required its current `#SpicyLyricsNPVCard` hook; that was added after reviewing upstream source, then rebuilt, checked and applied. With Lyrics and Next in queue selected, the final native panel hid both cards and retained artwork, track metadata and player controls. Those choices and the enabled master survived the apply/restart. Turning the master off restored the Spicy Lyrics controls and Next in queue heading/preview immediately; Spotify reported All changes saved.

The pre-test native state (master off, all five choices unchecked) was restored. Other Spiced preferences and the playback queue were preserved. Native evidence is saved in ignored `output/playwright/v0.6-native-options.png`. Credits, artist biography and loading placeholders were validated in fixtures and installed source; the current local track did not render those cards during native acceptance. Native expanded lyrics mode and future third-party wrapper changes remain untested.

## Related videos, On tour and final polish — v0.6.1 (November 19, 2026)

The two extra card choices are selected by default when Declutter is enabled. `npm run check` passes **57 tests across nine files**, including independent toggles, saved disabled selections, cleanup, sidebar scoping, and the video accessibility-label fallback without its generated class. The release bundle is **41,144 bytes**. `npm run local:apply` completed, and a final rebuild matched the installed file: `22948B587FA5728E390CDD8DC4BAE25FB2B6F57E7C6BC01F83EFD27F913508BD`. `git diff --check` passes.

Native Spotify showed v0.6.1 and the complete seven-checkbox layout. Related music videos and On tour were individually unchecked and rechecked, with **All changes saved** observed. Their original checked selections and the enabled master were restored; existing choices and playback remained unchanged. The current paused track did not render either card, so their actual native visibility reversal was not established in this final pass. Hide/show behavior is covered by the automated DOM fixtures and selectors inspected in the installed XPUI source.

Final polish updates the README around the current feature set and clarifies the isolated, version-sensitive selector fallbacks. No speculative performance changes or extra runtime dependencies were introduced.
