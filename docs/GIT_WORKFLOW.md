# Git Workflow

## Branches

| Branch | Purpose | Rules |
| --- | --- | --- |
| `main` | Always runnable; demo-ready | No direct pushes; changes arrive by pull request |
| `feature/member<N>-<topic>` | Day-to-day work, e.g. `feature/member2-threshold-rules` | One topic per branch; keep it short-lived (≤ 1 week) |
| `fix/<topic>` | Bug fixes found during integration | Same as feature branches |
| `contracts/<topic>` | Changes to `shared-contracts/` or the DB schema | Needs approval from every affected member |

```bash
git switch main && git pull
git switch -c feature/member4-websocket
# …work, commit…
git push -u origin feature/member4-websocket     # then open a pull request into main
```
Keep the branch current with `git pull --rebase origin main`, or merge `main` into it before opening the PR.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) style, imperative mood:
```
feat(api): add /rooms/{room_id}/data-quality endpoint
fix(db): reconnect pool after PostgreSQL restart
docs: add deployment guide
test(websocket): cover subscription filters
```

## Pull requests

Before opening one:
- [ ] `pytest` passes (from `backend/`)
- [ ] An endpoint changed → `python scripts/export_openapi.py` and commit `shared-contracts/openapi.json`
- [ ] A WebSocket event changed → update `shared-contracts/websocket-events.json`
- [ ] The schema changed → a **new** migration file (never edit an applied one; see `backend/database/migrations/README.md`)

Review: at least one other member approves. **Contract changes** (shared-contracts, schema) need approval from every member they affect.

## Never commit
`.env` files, `venv/`, `node_modules/`, `logs/`, database dumps. `.gitignore` already covers these.
