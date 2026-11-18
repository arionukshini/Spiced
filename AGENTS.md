# Spiced development

- Build and validate changes with `npm run check`.
- Apply completed changes yourself using `npm run local:apply`; the user has authorized installing and restarting Spotify for development checks.
- Test changed behavior in the actual Spotify app when available, including live enable/disable and persistence where relevant. Use the browser harness for additional CSS and theme checks.
- Report the exact validation performed and any concrete blockers. Do not describe harness tests as native Spotify tests.
- Preserve existing Spicetify registrations and user preferences. Keep features independent and clean up their styles and listeners.
