#!/bin/sh
# Container entrypoint: wait for PostgreSQL, apply migrations, optionally load
# the demo building, then start the API. Extra arguments go to uvicorn.
set -e

attempt=1
until python -m database.migrations.migrate; do
    status=$?
    # migrate.py exits 2 when it cannot connect; anything else is a real failure
    if [ "$status" -ne 2 ] || [ "$attempt" -ge 20 ]; then
        echo "Migrations failed (exit code $status) - not starting the API."
        exit "$status"
    fi
    echo "Database not reachable yet (attempt $attempt/20) - retrying in 3s"
    attempt=$((attempt + 1))
    sleep 3
done

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    python -m database.seed
fi

# Single process on purpose: the event bus and WebSocket clients are in-memory
# (see docs/ARCHITECTURE.md, "Process model").
exec uvicorn api.main:app --host 0.0.0.0 --port "${API_PORT:-8000}" --proxy-headers "$@"
