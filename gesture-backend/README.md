# GestureNinja Backend

Real-time hand gesture detection using MediaPipe and WebSocket streaming for the NeuroLex AI accessibility platform.

## Setup

### Prerequisites

- Python 3.8+
- Webcam access

### Installation

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and adjust settings if needed:

```bash
cp .env.example .env
```

## Running the Server

```bash
python ws_server.py
```

The WebSocket server will start on `ws://0.0.0.0:8765`.

## Architecture

### Gesture Detection Pipeline

1. **Webcam Capture**: Reads frames from the default camera at ~30fps
2. **MediaPipe Hands**: Detects hand landmarks in real-time
3. **Index Fingertip Extraction**: Extracts landmark 8 (index fingertip)
4. **Normalization**: Converts pixel coordinates to 0-1 range (mirrored for selfie view)
5. **WebSocket Broadcast**: Sends `{x, y, confidence, gesture}` to all connected clients

### Message Format

Each frame sends:

```json
{
  "x": 0.5,
  "y": 0.3,
  "confidence": 0.95,
  "gesture": "pointing"
}
```

- **x, y**: Normalized coordinates (0-1 range), mirrored horizontally
- **confidence**: Hand detection confidence (0-1)
- **gesture**: Currently always "pointing" for index fingertip

### Fallback Behavior

If no hand is detected, the last known position is sent with `confidence: 0.0` to ensure smooth cursor movement.

### Frame Rate Control

Targets 30 FPS with frame delay of ~33ms between broadcasts to balance responsiveness and network traffic.

## Performance Notes

- Uses single-hand detection (optimized for single player)
- Lightweight coordinate streaming (only x, y, confidence)
- Async I/O for non-blocking WebSocket handling
- MediaPipe runs on CPU (GPU support available with CUDA)

## Troubleshooting

### Webcam not found

Ensure webcam is connected and not in use by another application.

### High latency

- Check network connection quality
- Reduce frame rate by increasing frame_delay
- Verify GPU/CPU load

### No hands detected

- Improve lighting conditions
- Ensure hand is clearly visible
- Adjust MediaPipe confidence thresholds in `main.py`

## Frontend Integration

Connect from Next.js frontend using the `useGestureSocket` hook:

```typescript
const { cursorPos, isConnected, error } = useGestureSocket(
  "ws://localhost:8765",
);
```

See `frontend-next/src/hooks/useGestureSocket.ts` for implementation.
