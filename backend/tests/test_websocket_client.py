"""
Manual WebSocket test client — prints every event the server pushes.

Start the API first, then (from backend/):
    python tests/test_websocket_client.py
    python tests/test_websocket_client.py --events route_updated,room_status_changed
    python tests/test_websocket_client.py --url ws://192.168.1.20:8000/ws/v1/live

Open several terminals to watch one event reach multiple clients. Trigger events
with POST /api/v1/system/events/publish (see docs/DEMO_SCRIPT.md). Ctrl+C to quit.

(Not collected by pytest: it defines no test functions. Automated WebSocket tests
live in tests/test_websocket.py.)
"""
import argparse
import asyncio
import json
import sys

try:
    import websockets
except ImportError:
    print("websockets not installed. Run: pip install -r requirements.txt")
    sys.exit(1)


async def listen(url: str, client_id: str, events: str) -> None:
    uri = f"{url}?client_id={client_id}" + (f"&events={events}" if events else "")
    print(f"Connecting to {uri} ...")
    async with websockets.connect(uri) as ws:
        print("Connected. Waiting for events (Ctrl+C to quit)\n")
        while True:
            msg = json.loads(await ws.recv())
            kind = msg.get("event_type") or msg.get("type", "message")
            if kind == "heartbeat":
                print(f"[{msg['timestamp']}] heartbeat ({msg['data']['connected_clients']} client(s))")
                continue
            print(f"[{msg.get('timestamp', '?')}] {kind}")
            print(f"  data: {json.dumps(msg.get('data', msg), indent=2)}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="PyroNav WebSocket test client")
    parser.add_argument("--url", default="ws://localhost:8000/ws/v1/live")
    parser.add_argument("--client-id", default="test-client")
    parser.add_argument("--events", default="", help="comma-separated event types (default: all)")
    args = parser.parse_args()
    try:
        asyncio.run(listen(args.url, args.client_id, args.events))
    except KeyboardInterrupt:
        print("Disconnected.")
    except OSError as exc:
        print(f"Cannot connect: {exc}. Is the API running?")


if __name__ == "__main__":
    main()
