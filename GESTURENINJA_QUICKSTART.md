# Quick Start Guide - GestureNinja

## Backend Server Setup (One-Time)

### Prerequisites
- Python 3.8+ installed
- Webcam connected to your computer

### Installation Steps

```bash
# Navigate to gesture backend
cd gesture-backend

# Create a Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running the Backend Server

```bash
# Make sure you're in gesture-backend directory with venv activated
python main.py
```

**Expected Output:**
```
Starting GestureNinja backend on ws://0.0.0.0:8765
```

The server will:
- Listen on `ws://0.0.0.0:8765`
- Detect your hand via webcam
- Stream normalized coordinates (x, y, confidence) at ~30fps
- Auto-broadcast to all connected clients

**Keep this terminal open while playing the game.**

## Frontend Setup & Testing

### In a new terminal:

```bash
cd frontend-next
npm run dev
```

Visit: **http://localhost:3000/games/gesture-ninja**

### What to Expect

1. **Game Canvas** appears with dark background
2. **Score & Lives** display in top-left
3. **Fruits spawn** from bottom edges (watermelon 🍉, orange 🟠, apple 🍎)
4. **Move your hand** — follow a fruit with your index finger
5. **Golden blade trail** follows your finger
6. **Slice fruits** by crossing them with your finger motion
7. **Game Over** shows metrics: accuracy, reaction time, slices

## Game Mechanics

| Element | Behavior |
|---------|----------|
| **Fruits** | Spawn 1 per 1.2s, follow parabolic arc upward |
| **Slice** | Blade (last 10 cursor positions) intersects fruit circle |
| **Score** | +10 base, ×1.5 multiplier per 3 consecutive slices |
| **Lives** | Start with 3, lose 1 per unsliced fruit exit |
| **Combo** | Golden multiplier shown during streaks (visible during play) |

## Post-Game Metrics

When you lose all lives, you see:
- **Final Score** — Total points earned
- **Fruits Sliced** — Count vs. total spawned
- **Accuracy %** — Sliced/total percentage
- **Avg Reaction Time** — ms from spawn to slice

These metrics feed into NeuroLex's progress tracking for dyslexia assessment.

## Troubleshooting

### Backend won't start: "ModuleNotFoundError"
```bash
# Make sure venv is activated, then:
pip install --upgrade -r requirements.txt
```

### WebSocket shows "Disconnected"
1. Check backend is running: `python main.py`
2. Verify port 8765 not blocked by firewall
3. Try http://localhost:3000/games/gesture-ninja (localhost vs 127.0.0.1)

### No hands detected
- Ensure good lighting
- Position hand clearly in front of webcam
- Avoid dark backgrounds behind your hand
- Stay within 60cm of camera

### Game lag/stuttering
- Close other GPU-intensive apps
- Check CPU load on MediaPipe process
- Reduce monitor refresh rate if needed

## File Structure

```
gesture-backend/
  main.py              ← Gesture detection + WebSocket server
  requirements.txt     ← Python dependencies
  README.md           ← Detailed docs

frontend-next/
  src/
    hooks/
      useGestureSocket.ts    ← WebSocket connection hook
    components/
      GameCanvas.tsx         ← Main game loop & rendering
    app/games/
      gesture-ninja/
        page.tsx             ← Game page route
```

## Architecture

```
Webcam
  ↓
[Backend: MediaPipe Hand Detection]
  ↓ ws://localhost:8765
  {x, y, confidence, gesture}
  ↓
[Frontend: useGestureSocket Hook]
  ↓ (useRef - no re-renders)
  cursorPos: {x, y}
  ↓
[GameCanvas: requestAnimationFrame Loop]
  ├─ Update fruits (gravity, positions)
  ├─ Check line-circle collision (blade vs fruit)
  ├─ On slice: split animation + score++
  └─ Render canvas + UI overlay
```

## Performance Notes

- **Backend**: ~30fps gesture streaming (lightweight)
- **Frontend**: 60fps canvas rendering (smooth visuals)
- **Collision Math**: Line-circle intersection (fast)
- **Memory**: Auto-cleans old particles & sliced fruits
- **Latency**: ~33ms gesture → ~16ms render = no lag

---

**Ready to play? Start the backend, open the frontend, and get slicing! 🥇**
