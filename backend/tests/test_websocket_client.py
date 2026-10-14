"""
Manual WebSocket test client.
Start the API first, then run: python backend/tests/test_websocket_client.py
Ctrl+C to disconnect.
"""
import asyncio
import json
import sys

try:
    import websockets
except ImportError:
    print("websockets not installed. Run: pip install websockets")
    sys.exit(1)


async def listen():
    uri = "ws://localhost:8000/ws/v1/live?client_id=test-client"
    print(f"Connecting to {uri} …")

    async with websockets.connect(uri) as ws:
        print("Connected. Waiting for events (Ctrl+C to quit)…\n")
        try:
            while True:
                raw = await ws.recv()
                msg = json.loads(raw)
                print(f"[{msg.get('timestamp', '?')}] {msg.get('event_type', 'message')}")
                print(f"  data: {json.dumps(msg.get('data', msg), indent=2)}\n")
        except KeyboardInterrupt:
            print("Disconnecting…")


if __name__ == "__main__":
    asyncio.run(listen())
