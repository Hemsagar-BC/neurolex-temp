# GestureNinja Integration Guide

Complete guide to integrating gesture detection into NeuroLex's Fruit Ninja game.

## Architecture Overview

```
┌─────────────────────┐
│  Python Backend     │
│  (gesture-backend)  │
│  - MediaPipe Hands  │
│  - WebSocket Server │
│  - Port 8765        │
└──────────┬──────────┘
           │ ws://localhost:8765
           │ {x, y, confidence}
           │
┌──────────▼──────────┐
│  Next.js Frontend   │
│  - useGestureSocket │
│  - GameCanvas       │
│  - Port 3000        │
└─────────────────────┘
```

## Component Breakdown

### 1. Python Backend (`gesture-backend/main.py`)

**Purpose**: Capture hand gestures and stream normalized coordinates via WebSocket.

**Key Features**:

- Uses MediaPipe Hands to detect right hand index fingertip (landmark 8)
- Normalizes coordinates to 0-1 range
- Mirrors x-axis (webcam mirroring)
- Maintains fallback position when hand is not detected
- Streams at ~30fps to all connected clients
- Graceful handling of multiple client connections

**Key Constants**:

- `target_fps = 30` — Frame rate (~33ms per frame)
- `min_detection_confidence = 0.7` — MediaPipe detection threshold
- `max_num_hands = 1` — Only detect one hand (performance)

**Message Format**:

```json
{
  "x": 0.45,
  "y": 0.32,
  "confidence": 0.92,
  "gesture": "pointing"
}
```

**Running**:

```bash
cd gesture-backend
pip install -r requirements.txt
python main.py
```

### 2. Next.js Hook (`useGestureSocket.ts`)

**Purpose**: Connect to WebSocket, parse messages, provide cursor position without re-renders.

**Key Design**:

- Uses `useRef` for `cursorPosRef` to avoid re-renders on every cursor move
- State only updated for connection status and errors
- Auto-reconnects with 2-second delay on disconnect
- Handles WebSocket lifecycle (open, message, error, close)

**Return Value**:

```typescript
{
  cursorPos: { x: number; y: number },  // 0-1 normalized
  isConnected: boolean,
  error: string | null
}
```

**Usage**:

```typescript
const { cursorPos, isConnected, error } = useGestureSocket();
// cursorPos.x and .y updated every frame without re-rendering
```

### 3. Game Canvas (`GameCanvas.tsx`)

**Purpose**: Render Fruit Ninja game with gesture-based blade control.

#### Game State

| Property     | Value         | Notes                      |
| ------------ | ------------- | -------------------------- |
| Lives        | 3             | Lose 1 per unsliced fruit  |
| Score        | +10 per slice | Incremented on fruit slice |
| Spawn Rate   | 1/1.2s        | One fruit every 1200ms     |
| Fruit Radius | 40px          | Visual size                |
| Gravity      | 0.5px/frame²  | Physics simulation         |
| Canvas Size  | 1024×768      | Fixed dimensions           |

#### Fruit Physics

Fruits spawn from bottom edges with parabolic trajectories:

- **Spawn Position**: Random x at bottom or sides
- **Velocity**: Aimed toward canvas center with random jitter
- **Gravity**: Applied each frame (vy += 0.5)
- **Removal**: Despawn if y > height (unsliced = -1 life)

#### Blade Trail & Slice Detection

**Trail System** (Line-Circle Intersection):

- Stores last 10 cursor positions
- Drawn as fading golden polyline
- Cursor dot at trail tip (8px radius)

**Collision Math**:
Uses parametric line-circle intersection:

1. Vector from line start to circle center
2. Solve quadratic for closest point on line
3. Check if intersection occurs within line segment bounds (0 ≤ t ≤ 1)

**On Slice**:

- Split fruit into 2 half-circles
- Parts fly apart with momentum
- Fade out over 300ms
- Score += 10

#### Rendering Pipeline

1. Clear canvas with dark background (#0a0a0a)
2. Update fruits (gravity, position, bounds check)
3. Draw fruits (circles with random colors)
4. Draw sliced parts (smaller circles, golden)
5. Draw blade trail (polyline with gradient alpha)
6. Draw UI overlay (score, lives, connection status)

#### Performance Optimizations

- Uses `useRef` for cursor position (no re-renders)
- Single `requestAnimationFrame` loop
- Direct canvas rendering (no virtual DOM)
- Efficient particle cleanup
- Capped at 60fps (RAF throttling)

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to gesture backend
cd gesture-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python main.py
# Server runs on ws://0.0.0.0:8765
```

### 2. Frontend Integration

Files already created:

- ✅ `src/hooks/useGestureSocket.ts` — WebSocket connection hook
- ✅ `src/components/GameCanvas.tsx` — Game rendering component
- ✅ `src/app/games/gesture-ninja/page.tsx` — Page route

**Start the Next.js dev server**:

```bash
cd frontend-next
npm run dev
# Visit http://localhost:3000/games/gesture-ninja
```

### 3. Verify Connection

- Check browser console for connection logs
- Verify Python backend shows "Client connected" messages
- Gesture canvas displays yellow "WebSocket: Disconnected" if connection fails

## Development Notes

### Collision Detection

The line-circle intersection uses the closest point on the line segment:

```
For line (x1,y1)→(x2,y2) and circle (cx,cy,r):
1. Parametric: P(t) = (x1,y1) + t·(x2-x1, y2-y1)
2. Find t where |P(t)-(cx,cy)| = r
3. Clamp t ∈ [0,1] to segment bounds
4. Check discriminant > 0 for real intersection
```

### Frame Rate Control

- Python backend: ~30fps (frame_delay = 33ms)
- Next.js canvas: ~60fps (requestAnimationFrame)
- Result: Gesture data arrives 2x slower than rendering (smooth interpolation)

### Font Handling

OpenDyslexic already imported in `globals.css` from CDN. Canvas uses system font fallback:

```css
font-family: "OpenDyslexic", sans-serif;
```

### Accessibility Features

- High contrast: Dark background (#0a0a0a), golden accents (#FFD700)
- OpenDyslexic font for all text UI
- Large touch targets (fruits r=40px)
- Clear score/lives display

## Troubleshooting

### "WebSocket: Disconnected" shown in game

1. Check Python backend is running: `python gesture-backend/main.py`
2. Verify port 8765 is not blocked by firewall
3. Check browser console for error details
4. Try `ws://127.0.0.1:8765` if localhost fails

### Hand not detected

1. Ensure webcam has good lighting
2. Check MediaPipe detection confidence in backend
3. Verify hand is clearly visible and not too close/far
4. Try adjusting `min_detection_confidence` in `main.py`

### Game lag or stuttering

1. Close other GPU-intensive applications
2. Reduce spawn rate by increasing `FRUIT_SPAWN_INTERVAL`
3. Check if MediaPipe is CPU-bound (enable GPU if available)
4. Profile canvas rendering with DevTools

### Cursor trails not appearing

1. Ensure WebSocket is connected (check error message)
2. Try moving hand slowly and steadily
3. Verify `useGestureSocket` hook is returning position updates
4. Check browser DevTools → Network → WS to see incoming messages

## Future Enhancements

- [ ] Multi-hand support (two-player mode)
- [ ] Different difficulty levels (spawn rate progression)
- [ ] Sound effects (slice, score, game over)
- [ ] Gesture recognition (ok sign, thumbs up for powerups)
- [ ] Leaderboard integration
- [ ] Tutorial/onboarding flow
- [ ] Mobile responsive canvas scaling
