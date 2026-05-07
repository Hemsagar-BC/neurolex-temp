import asyncio
import json
import math
import os
import time
import urllib.request
from typing import Set, Optional, Tuple

import cv2
import websockets

MODEL_PATH = "hand_landmarker.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"

connected_clients: Set[websockets.WebSocketServerProtocol] = set()
last_position = {"x": 0.5, "y": 0.5, "confidence": 0.0}
running = True


def ensure_model_file() -> None:
    if os.path.exists(MODEL_PATH):
        return

    print("Downloading MediaPipe model...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Download complete!")


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def normalize_coords(x: float, y: float, confidence: float) -> dict:
    return {
        "x": clamp01(x),
        "y": clamp01(y),
        "confidence": clamp01(confidence),
    }


def get_tasks_tracker(mp) -> Optional[Tuple[str, object]]:
    try:
        if not hasattr(mp, "tasks"):
            return None

        ensure_model_file()
        BaseOptions = mp.tasks.BaseOptions
        HandLandmarker = mp.tasks.vision.HandLandmarker
        HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=VisionRunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=0.7,
            min_hand_presence_confidence=0.7,
            min_tracking_confidence=0.7,
        )
        tracker = HandLandmarker.create_from_options(options)
        return "tasks", tracker
    except Exception as exc:
        print(f"MediaPipe tasks init failed: {exc}")
        return None


def get_solutions_tracker(mp) -> Optional[Tuple[str, object]]:
    try:
        if not hasattr(mp, "solutions"):
            return None

        hands_module = mp.solutions.hands
        tracker = hands_module.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )
        return "solutions", tracker
    except Exception as exc:
        print(f"MediaPipe solutions init failed: {exc}")
        return None


def extract_tasks_coords(mp, result) -> Optional[dict]:
    if not result.hand_landmarks:
        return None

    landmark = result.hand_landmarks[0][8]
    confidence = 1.0
    if result.handedness and result.handedness[0]:
        confidence = result.handedness[0][0].score

    return normalize_coords(landmark.x, landmark.y, confidence)


def extract_solutions_coords(results) -> Optional[dict]:
    if not results.multi_hand_landmarks:
        return None

    fingertip = results.multi_hand_landmarks[0].landmark[8]
    confidence = 1.0
    if results.multi_handedness:
        confidence = results.multi_handedness[0].classification[0].score

    return normalize_coords(fingertip.x, fingertip.y, confidence)


async def broadcast(message: str) -> None:
    if not connected_clients:
        return

    await asyncio.gather(
        *[client.send(message) for client in connected_clients],
        return_exceptions=True,
    )


async def handle_client(websocket, path=None):
    if path is None:
        path = getattr(websocket, "path", "")
    connected_clients.add(websocket)
    print(f"Client connected {path}. Total clients: {len(connected_clients)}")

    try:
        async for _message in websocket:
            pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")


async def mock_gesture_stream() -> None:
    global last_position

    start_time = time.time()
    while running:
        elapsed = (time.time() - start_time) % 10
        t = (elapsed / 10) * 2 * math.pi
        x = 0.5 + 0.3 * math.sin(t)
        y = 0.3 + 0.2 * math.sin(t / 2)
        confidence = min(1.0, elapsed / 0.5) if elapsed > 0.1 else 0.0

        last_position = normalize_coords(x, y, confidence)

        message = json.dumps({
            "x": last_position["x"],
            "y": last_position["y"],
            "confidence": last_position["confidence"],
            "gesture": "mock",
        })
        await broadcast(message)
        await asyncio.sleep(0.033)


async def gesture_stream() -> None:
    global last_position, running

    try:
        import mediapipe as mp
    except Exception as exc:
        print(f"MediaPipe import failed: {exc}")
        mp = None

    tracker_mode = None
    tracker = None
    if mp is not None:
        tasks_tracker = get_tasks_tracker(mp)
        if tasks_tracker:
            tracker_mode, tracker = tasks_tracker
        else:
            solutions_tracker = get_solutions_tracker(mp)
            if solutions_tracker:
                tracker_mode, tracker = solutions_tracker

    if tracker is None:
        print("MediaPipe unavailable. Using mock stream.")
        await mock_gesture_stream()
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Camera not found. Using mock stream.")
        await mock_gesture_stream()
        return

    target_fps = 30
    frame_delay = 1.0 / target_fps

    try:
        while running:
            success, frame = cap.read()
            if not success:
                await asyncio.sleep(0.01)
                continue

            frame = cv2.flip(frame, 1)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            coords = None
            if tracker_mode == "tasks":
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                timestamp = int(time.time() * 1000)

                result = tracker.detect_for_video(
                    mp_image,
                    timestamp
                )
                coords = extract_tasks_coords(mp, result)
            else:
                results = tracker.process(frame_rgb)
                coords = extract_solutions_coords(results)

            if coords:
                last_position = coords
            else:
                coords = last_position.copy()
                coords["confidence"] = 0.0

            message = json.dumps({
                "x": coords["x"],
                "y": coords["y"],
                "confidence": coords["confidence"],
                "gesture": "pointing",
            })

            await broadcast(message)
            await asyncio.sleep(frame_delay)
    finally:
        cap.release()
        if hasattr(tracker, "close"):
            tracker.close()


async def main() -> None:
    print("Starting GestureNinja backend on ws://0.0.0.0:8765")

    gesture_task = asyncio.create_task(gesture_stream())
    async with websockets.serve(handle_client, "0.0.0.0", 8765):
        try:
            await asyncio.gather(gesture_task)
        except KeyboardInterrupt:
            print("Shutting down...")
            global running
            running = False


if __name__ == "__main__":
    asyncio.run(main())
