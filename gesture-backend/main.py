import cv2
import mediapipe as mp
import urllib.request
import os
import random
import math
import time

# =========================================================
# DOWNLOAD MODEL
# =========================================================

MODEL_PATH = "hand_landmarker.task"

if not os.path.exists(MODEL_PATH):

    print("Downloading MediaPipe model...")

    url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"

    urllib.request.urlretrieve(url, MODEL_PATH)

    print("Download complete!")

# =========================================================
# MEDIAPIPE SETUP
# =========================================================

BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# =========================================================
# HAND CONNECTIONS
# =========================================================

HAND_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,4),
    (0,5),(5,6),(6,7),(7,8),
    (0,9),(9,10),(10,11),(11,12),
    (0,13),(13,14),(14,15),(15,16),
    (0,17),(17,18),(18,19),(19,20),
    (5,9),(9,13),(13,17),
]

FINGERTIPS = [4, 8, 12, 16, 20]

# =========================================================
# GAME VARIABLES
# =========================================================

score = 0
missed = 0

MAX_MISSES = 5

trail_points = []

fruits = []

fruit_names = ["A", "B", "C", "D", "E"]

last_spawn_time = time.time()

game_over = False

feedback = ""
feedback_timer = 0

# =========================================================
# CREATE FRUIT / BOMB
# =========================================================

def create_fruit():

    x = random.randint(100, 540)

    # 20% chance of bomb
    is_bomb = random.randint(1, 5) == 1

    if is_bomb:

        fruit = {
            "x": x,
            "y": 480,
            "radius": 40,
            "speed": random.randint(8, 12),
            "letter": "X",
            "sliced": False,
            "type": "bomb"
        }

    else:

        fruit = {
            "x": x,
            "y": 480,
            "radius": 35,
            "speed": random.randint(8, 12),
            "letter": random.choice(fruit_names),
            "sliced": False,
            "type": "fruit"
        }

    return fruit

# =========================================================
# DRAW HAND LANDMARKS
# =========================================================

def draw_landmarks(frame, landmarks):

    h, w, _ = frame.shape

    points = {}

    # STORE ALL POINTS
    for idx, lm in enumerate(landmarks):

        cx = int(lm.x * w)
        cy = int(lm.y * h)

        points[idx] = (cx, cy)

    # DETECT RAISED FINGERS
    raised_fingers = []

    for tip, pip in [(8,6), (12,10), (16,14), (20,18)]:

        if points[tip][1] < points[pip][1]:
            raised_fingers.append(tip)

    # DRAW LANDMARKS
    for idx, (cx, cy) in points.items():

        color = (0,255,0)

        if idx in FINGERTIPS:
            color = (255,0,255)

        if idx in raised_fingers:
            color = (255,255,0)

        cv2.circle(frame, (cx, cy), 5, color, cv2.FILLED)

    # DRAW CONNECTIONS
    for start, end in HAND_CONNECTIONS:

        if start in points and end in points:

            cv2.line(
                frame,
                points[start],
                points[end],
                (0,200,255),
                2
            )

    return points

# =========================================================
# DRAW UI
# =========================================================

def draw_ui(frame):

    overlay = frame.copy()

    cv2.rectangle(
        overlay,
        (0,0),
        (640,80),
        (30,30,30),
        -1
    )

    alpha = 0.6

    cv2.addWeighted(
        overlay,
        alpha,
        frame,
        1-alpha,
        0,
        frame
    )

    # TITLE
    cv2.putText(
        frame,
        "Gesture Slice Trainer",
        (140,40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255,255,255),
        3
    )

    # SCORE
    cv2.putText(
        frame,
        f"Score: {score}",
        (20,70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0,255,0),
        2
    )

    # MISSES
    cv2.putText(
        frame,
        f"Misses: {missed}/{MAX_MISSES}",
        (420,70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0,0,255),
        2
    )

# =========================================================
# DRAW FRUITS / BOMBS
# =========================================================

def draw_fruits(frame):

    global fruits
    global missed

    remove_list = []

    for fruit in fruits:

        if fruit["sliced"]:
            remove_list.append(fruit)
            continue

        # MOVE UPWARD
        fruit["y"] -= fruit["speed"]

        # GRAVITY
        fruit["speed"] -= 0.25

        # COLOR
        color = (0,140,255)

        # BOMB COLOR
        if fruit["type"] == "bomb":

            color = (0,0,255)

            # FLASHING EFFECT
            if int(time.time() * 5) % 2 == 0:
                color = (255,255,255)

        # FRUIT BODY
        cv2.circle(
            frame,
            (fruit["x"], int(fruit["y"])),
            fruit["radius"],
            color,
            cv2.FILLED
        )

        # WHITE OUTLINE
        cv2.circle(
            frame,
            (fruit["x"], int(fruit["y"])),
            fruit["radius"],
            (255,255,255),
            3
        )

        # LETTER / SYMBOL
        cv2.putText(
            frame,
            fruit["letter"],
            (fruit["x"] - 15, int(fruit["y"] + 12)),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.5,
            (255,255,255),
            4
        )

        # FRUIT MISSED
        if fruit["y"] > 520:

            remove_list.append(fruit)

            if fruit["type"] == "fruit":
                missed += 1

    # REMOVE OBJECTS
    for fruit in remove_list:

        if fruit in fruits:
            fruits.remove(fruit)

# =========================================================
# DRAW TRAIL
# =========================================================

def draw_trail(frame):

    for i in range(1, len(trail_points)):

        cv2.line(
            frame,
            trail_points[i - 1],
            trail_points[i],
            (255,255,0),
            5
        )

# =========================================================
# CHECK SLICE COLLISION
# =========================================================

def check_slice(cursor_x, cursor_y):

    global fruits
    global score
    global missed
    global feedback
    global feedback_timer

    for fruit in fruits:

        if fruit["sliced"]:
            continue

        distance = math.hypot(
            cursor_x - fruit["x"],
            cursor_y - fruit["y"]
        )

        if distance < fruit["radius"]:

            fruit["sliced"] = True

            # BOMB
            if fruit["type"] == "bomb":

                score -= 5
                missed += 1

                feedback = "BOMB HIT!"
                feedback_timer = 30

            # NORMAL FRUIT
            else:

                score += 1

                feedback = "GOOD!"
                feedback_timer = 20

# =========================================================
# MEDIAPIPE OPTIONS
# =========================================================

options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.IMAGE,
    num_hands=1,
    min_hand_detection_confidence=0.7,
    min_hand_presence_confidence=0.7,
    min_tracking_confidence=0.7,
)

# =========================================================
# CAMERA
# =========================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():

    print("Camera not found!")
    exit()

# =========================================================
# MAIN LOOP
# =========================================================

print("Fruit Slice Game Started!")

with HandLandmarker.create_from_options(options) as landmarker:

    while True:
        success, frame = cap.read()

        if not success:
            break

        frame = cv2.flip(frame, 1)

        h, w, _ = frame.shape

        # GAME OVER
        if missed >= MAX_MISSES:
            game_over = True

        # RGB CONVERSION
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame
        )

        result = landmarker.detect(mp_image)

        # SPAWN OBJECTS
        current_time = time.time()

        if current_time - last_spawn_time > 1.5 and not game_over:

            fruits.append(create_fruit())

            last_spawn_time = current_time

        # DRAW GAME
        draw_ui(frame)

        draw_fruits(frame)

        # HAND DETECTION
        if result.hand_landmarks and not game_over:

            for hand_landmarks in result.hand_landmarks:

                points = draw_landmarks(frame, hand_landmarks)

                # INDEX FINGER CURSOR
                cursor_x, cursor_y = points[8]

                # GLOWING CURSOR
                cv2.circle(
                    frame,
                    (cursor_x, cursor_y),
                    18,
                    (255,255,0),
                    cv2.FILLED
                )

                cv2.circle(
                    frame,
                    (cursor_x, cursor_y),
                    28,
                    (255,255,255),
                    2
                )

                # TRAIL EFFECT
                trail_points.append((cursor_x, cursor_y))

                if len(trail_points) > 15:
                    trail_points.pop(0)

                draw_trail(frame)

                # SLICE COLLISION
                check_slice(cursor_x, cursor_y)

        # FEEDBACK TEXT
        if feedback_timer > 0:

            color = (0,255,0)

            if "BOMB" in feedback:
                color = (0,0,255)

            cv2.putText(
                frame,
                feedback,
                (220,120),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.3,
                color,
                4
            )

            feedback_timer -= 1

        # GAME OVER SCREEN
        if game_over:

            overlay = frame.copy()

            cv2.rectangle(
                overlay,
                (80,120),
                (560,360),
                (0,0,0),
                -1
            )

            cv2.addWeighted(
                overlay,
                0.7,
                frame,
                0.3,
                0,
                frame
            )

            cv2.putText(
                frame,
                "GAME OVER",
                (180,200),
                cv2.FONT_HERSHEY_SIMPLEX,
                2,
                (0,0,255),
                5
            )

            cv2.putText(
                frame,
                f"Final Score: {score}",
                (180,280),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.2,
                (255,255,255),
                3
            )

            cv2.putText(
                frame,
                "Press R to Restart",
                (170,340),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0,255,255),
                3
            )

        # SHOW WINDOW
        cv2.imshow("Gesture Slice Trainer", frame)

        key = cv2.waitKey(1)

        # ESC
        if key == 27:
            break

        # RESTART
        if key == ord('r'):

            score = 0
            missed = 0
            fruits = []
            trail_points = []
            game_over = False
            feedback = ""
            feedback_timer = 0

# =========================================================
# CLEANUP
# =========================================================

cap.release()
cv2.destroyAllWindows()