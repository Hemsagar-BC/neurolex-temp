from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from firebase_admin import firestore

from app.schemas.game_result import (
    GameHistoryItem,
    SessionEndRequest,
    SessionEndResponse,
    SessionStartRequest,
    SessionStartResponse,
)

REACTION_THRESHOLDS = {
    "rapid_naming": 2000,
    "sound_builder": 5000,
    "nback": 3000,
    "clap_trap": 250,
    "stroop": 1500,
    "dot_connector": 60000,
}


def _db():
    return firestore.client()


def _now():
    return datetime.now(timezone.utc)


async def start_game_session(data: SessionStartRequest) -> SessionStartResponse:
    session_id = str(uuid4())
    now = _now()
    doc = {
        "sessionId": session_id,
        "userId": data.userId,
        "gameType": data.gameType,
        "difficulty": data.difficulty,
        "status": "active",
        "startedAt": now.isoformat(),
    }
    _db().collection("game_sessions").document(session_id).set(doc)
    return SessionStartResponse(
        sessionId=session_id,
        gameType=data.gameType,
        difficulty=data.difficulty,
        startedAt=now,
    )


async def end_game_session(data: SessionEndRequest) -> SessionEndResponse:
    db = _db()
    doc_ref = db.collection("game_sessions").document(data.sessionId)
    snap = doc_ref.get()

    if not snap.exists:
        raise ValueError("Session not found")
    session_data = snap.to_dict()
    if session_data.get("userId") != data.userId:
        raise ValueError("Session does not belong to this user")

    # Calculate next difficulty
    threshold = REACTION_THRESHOLDS.get(data.gameType, 2000)
    if data.accuracy >= 0.85 and data.avgReactionTimeMs < threshold:
        next_difficulty = min(data.difficulty + 1, 5)
    elif data.accuracy < 0.50:
        next_difficulty = max(data.difficulty - 1, 1)
    else:
        next_difficulty = data.difficulty

    now = _now()
    update = {
        "score": data.score,
        "accuracy": data.accuracy,
        "avgReactionTimeMs": data.avgReactionTimeMs,
        "totalAttempts": data.totalAttempts,
        "correctAttempts": data.correctAttempts,
        "durationSeconds": data.durationSeconds,
        "nextDifficulty": next_difficulty,
        "status": "completed",
        "completedAt": now.isoformat(),
    }
    doc_ref.update(update)

    # Update user_stats
    stats_ref = db.collection("user_stats").document(data.userId)
    stats_snap = stats_ref.get()
    if stats_snap.exists:
        stats = stats_snap.to_dict()
        best_scores = stats.get("bestScores", {})
        current_best = best_scores.get(data.gameType, 0)
        best_scores[data.gameType] = max(current_best, data.score)
        stats_ref.update({
            "gamesPlayed": firestore.Increment(1),
            "bestScores": best_scores,
        })
    else:
        stats_ref.set({
            "userId": data.userId,
            "gamesPlayed": 1,
            "bestScores": {data.gameType: data.score},
        })

    # Build message
    if next_difficulty > data.difficulty:
        message = "Amazing! You leveled up! 🎉"
    elif next_difficulty < data.difficulty:
        message = "Keep practicing, you'll get there! 💪"
    else:
        message = "Solid performance! Keep it up! ⭐"

    summary = {
        "score": data.score,
        "accuracy": data.accuracy,
        "avgReactionTimeMs": data.avgReactionTimeMs,
        "totalAttempts": data.totalAttempts,
        "correctAttempts": data.correctAttempts,
        "durationSeconds": data.durationSeconds,
        "difficulty": data.difficulty,
        "nextDifficulty": next_difficulty,
    }

    return SessionEndResponse(
        nextDifficulty=next_difficulty,
        message=message,
        summary=summary,
    )


async def get_user_game_history(
    user_id: str, game_type: Optional[str] = None
) -> List[GameHistoryItem]:
    db = _db()
    query = (
        db.collection("game_sessions")
        .where("userId", "==", user_id)
        .where("status", "==", "completed")
    )
    if game_type:
        query = query.where("gameType", "==", game_type)

    query = query.order_by("completedAt", direction=firestore.Query.DESCENDING).limit(20)

    docs = query.stream()
    items: List[GameHistoryItem] = []
    for doc in docs:
        d = doc.to_dict()
        completed_at = d.get("completedAt")
        if isinstance(completed_at, str):
            played_at = datetime.fromisoformat(completed_at)
        else:
            played_at = _now()

        items.append(
            GameHistoryItem(
                sessionId=d.get("sessionId", doc.id),
                gameType=d.get("gameType", ""),
                score=d.get("score", 0),
                accuracy=d.get("accuracy", 0),
                difficulty=d.get("difficulty", 1),
                nextDifficulty=d.get("nextDifficulty", 1),
                playedAt=played_at,
            )
        )
    return items