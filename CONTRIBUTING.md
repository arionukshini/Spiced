# Contributing to Spiced

Keep changes small and focused. For new snippets or enhancements, follow [Adding features](docs/adding-features.md): each feature needs its own toggle, compatibility handling, and cleanup. Prefer documented Spicetify APIs and CSS over recurring DOM work, and avoid new runtime dependencies unless they solve a clear need.

## Local setup

Use Node.js 22.16 or newer; `.node-version` selects the Node 22 release line used by CI.

```powershell
npm ci
npm run check
```

For changes to extension behavior, apply and test in Spotify:

```powershell
npm run local:apply
```

This can restart Spotify. Check live enable/disable, navigation where relevant, and preference restoration after restart. Inspect both the intended change and cleanup. A browser-harness result should be described as a harness result; include any native checks that remain untested. See [Performance and measurement](docs/performance.md) before making performance claims.

## Pull requests and reports

Explain the concrete problem, resulting behavior, and validation. Include Spotify and Spicetify versions when they affect compatibility. Add meaningful behavior tests for lifecycle or functional changes; simple styling changes can use focused visual checks.

Commit source files and `package-lock.json`. Keep dependencies, generated bundles, screenshots, logs, local settings, and Spicetify backups out of commits. The ignore rules cover these local files; new documentation images should be intentionally placed outside the ignored output directories.

CI runs `npm ci` and `npm run check` on Windows and Linux. The Ubuntu job uploads `dist/spiced.js` as the `spiced` artifact for 14 days. Runtime installation and Spotify checks happen locally, where the client is available.
