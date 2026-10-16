# Database Migrations

Numbered SQL files, applied in filename order by `migrate.py`. Each one runs in its own transaction and is recorded (with a checksum) in `schema_migrations`.

```bash
# from backend/
python -m database.migrations.migrate            # apply pending migrations
python -m database.migrations.migrate --status   # applied / pending / modified-after-apply
```
The API can also apply them at startup (`AUTO_MIGRATE=true`), and the Docker image always does.

| File | Contents |
| --- | --- |
| `001_initial_schema.sql` | All tables, enums and views for the four members' domains |
| `002_performance_and_operations.sql` | Composite indexes, integrity checks, `security_events`, `room_sensor_freshness` view, `purge_old_data()`, UTC database default |
| `003_seed_demo_building.sql` | Member 3: inserts a demo graph if missing. It is an older 6-room layout, so run `python -m database.seed --replace` to get the current demo hospital |
| `004_member4_hospital3d_registry.sql` | Columns for Member 1's 3D-hospital registry: `rooms.floor_id/kind/category`, `sensors.mount/metadata`. The rows are loaded from `shared-contracts/hospital-3d-sensors.json` by `python -m database.seed` |

## Adding a schema change

1. Create the next number, with your member number in the name so parallel work doesn't collide: `004_member2_room_occupancy.sql`. If two files end up with the same number, both still run (in filename order); just make sure they don't depend on each other.
2. Write plain SQL. Prefer idempotent forms (`CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
3. Run `python -m database.migrations.migrate`, then `pytest`. The test suite migrates a fresh schema from scratch, which catches ordering mistakes.
4. If the change affects an API response or event, update `shared-contracts/` in the same PR.

## Rules

- **Never edit a migration that has already been applied** anywhere: the runner will not re-run it. `--status` flags it as `modified-after-apply`, and the API logs a warning. Write a new migration instead.
- One concern per file; name it after what it does.
- A failing migration is rolled back completely and stops the run. Nothing is half-applied.
- `ALTER TYPE … ADD VALUE` (new enum value) cannot be used in the same transaction as the new value. Put it in its own migration.
- Concurrent runners (several containers starting at once) are serialised with a PostgreSQL advisory lock.
