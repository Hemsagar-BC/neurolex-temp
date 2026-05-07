"""
Fallback mock gesture backend - simulates cursor for testing when mediapipe unavailable
"""
import asyncio
import json
import numpy as np
import websockets
from typing import Set
import math
import time

connected_clients: Set[websockets.WebSocketServerProtocol] = set()
last_position = {"x": 0.5, "y": 0.5, "confidence": 0.0}

async def generate_mock_gesture():
    """Simulate smooth hand movements in a figure-8 pattern"""
    start_time = time.time()
    while True:
        elapsed = (time.time() - start_time) % 10  # 10-second cycle

        # Figure-8 pattern
        t = (elapsed / 10) * 2 * math.pi
        x = 0.5 + 0.3 * math.sin(t)
        y = 0.3 + 0.2 * math.sin(t / 2)

        # Clamp to [0, 1]
        x = max(0, min(1, x))
        y = max(0, min(1, y))

        # Add confidence that increases after 0.5s
        confidence = min(1.0, elapsed / 0.5) if elapsed > 0.1 else 0.0

        last_position = {
            "x": round(x, 3),
            "y": round(y, 3),
            "confidence": round(confidence, 2),
            "gesture": "none"
        }

        # Broadcast to all connected clients
        if connected_clients:
            message = json.dumps(last_position)
            disconnected = set()
            for client in connected_clients:
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(client)
            connected_clients.difference_update(disconnected)

        await asyncio.sleep(0.033)  # ~30fps

async def handler(websocket, path):
    """Handle incoming WebSocket connections"""
    connected_clients.add(websocket)
    print(f"Client connected. Total clients: {len(connected_clients)}")

    try:
        async for message in websocket:
            # Echo any messages back
            await websocket.send(message)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")

async def main():
    print("Starting Mock Gesture Backend on ws://0.0.0.0:8765")
    print("(Using simulated cursor - MediaPipe unavailable)")

    # Start gesture simulation
    asyncio.create_task(generate_mock_gesture())

    # Start WebSocket server
    async with websockets.serve(handler, "0.0.0.0", 8765):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
