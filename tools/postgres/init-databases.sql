-- Development databases of the API apps, one per app. Postgres runs this file only when its
-- volume is empty, i.e. on the first `docker compose up`. For an existing volume create a new
-- database by hand: docker compose exec postgres createdb -U app <name>
-- Test databases are not listed here, the test setup of each project creates its own.
CREATE DATABASE express_api_base;
