Data Flow in Detail
Python side — what it sends every frame:
{
  "x": 0.63,
  "y": 0.41,
  "confidence": 0.97,
  "gesture": "pointing"
}
Next.js side — what it does with it:
1. useGestureSocket hook maintains WS connection
2. On each message → update a cursorRef (useRef, not useState — no re-render lag)
3. Game loop (requestAnimationFrame) reads cursorRef each frame
4. Checks collision: did the cursor path intersect a fruit bounding circle?
5. If yes → slice animation + score++

Webcam
  ↓
Python (OpenCV + MediaPipe)
  → detects index fingertip (x, y)
  → normalizes to 0–1 range
  → sends via WebSocket (ws://localhost:8765)
        ↓
Next.js Page (/gesture-ninja)
  → WebSocket client receives {x, y}
  → maps coords to canvas size
  → moves a "blade cursor" on HTML5 Canvas
  → Canvas runs Fruit Ninja game loop
  → slice detection = fingertip collides with fruit