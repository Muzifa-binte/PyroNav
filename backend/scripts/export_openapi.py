"""
Export the REST API's OpenAPI spec to shared-contracts/openapi.json.

Run from backend/ after changing any endpoint, and commit the result, so the
frontend team always has the current machine-readable contract:
    python scripts/export_openapi.py

No server or database is needed — the spec is generated from the code.
"""
import json
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("LOG_DIR", "")

from api.main import app  # noqa: E402

OUTPUT = BACKEND_DIR.parent / "shared-contracts" / "openapi.json"


def main() -> None:
    spec = app.openapi()
    OUTPUT.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n",
                      encoding="utf-8", newline="\n")  # LF on Windows too
    print(f"Wrote {OUTPUT} ({len(spec['paths'])} paths, API version {spec['info']['version']})")


if __name__ == "__main__":
    main()
