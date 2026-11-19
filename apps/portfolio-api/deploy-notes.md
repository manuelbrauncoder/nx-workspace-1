<!-- Shown in the step summary of the CI job "Build and push image" for each release of this app. -->

The API listens on port **3000** (`port` in the config file). Mount the config file and set `CONFIG_PATH`, `DATABASE_URL` and `SESSION_SECRET`. Apply migrations with `node dist/scripts/migrate.js` before starting the API, and load the initial content once with `node dist/scripts/seed.js`. Set `SMTP_PASSWORD` while `mail.enabled` is true.
