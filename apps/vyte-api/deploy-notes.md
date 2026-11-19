<!-- Shown in the step summary of the CI job "Build and push image" for each release of this app. -->

The API listens on port **3000** (`port` in the config file). Mount the config file and set `CONFIG_PATH`, `DATABASE_URL` and `SESSION_SECRET`. Apply migrations with `node dist/scripts/migrate.js` before starting the API. The API writes to `/app/uploads`, a mounted folder must belong to uid 1000.
