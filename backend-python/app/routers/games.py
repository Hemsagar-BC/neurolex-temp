from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.game_result import (
    GameHistoryItem,
    SessionEndRequest,
    SessionEndResponse,
    SessionStartRequest,
    SessionStartResponse,
)
from app.services import games_service

router = APIRouter(prefix="/api/games", tags=["games"])


@router.post("/session/start", response_model=SessionStartResponse)
async def start_session(data: SessionStartRequest):
    try:
        return await games_service.start_game_session(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/end", response_model=SessionEndResponse)
async def end_session(data: SessionEndRequest):
    try:
        return await games_service.end_game_session(data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{userId}", response_model=List[GameHistoryItem])
async def get_history(
    userId: str,
    gameType: Optional[str] = Query(None, description="Filter by game type"),
):
    try:
        return await games_service.get_user_game_history(userId, gameType)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/difficulty/{userId}/{gameType}")
async def get_difficulty(userId: str, gameType: str):
    try:
        history = await games_service.get_user_game_history(userId, gameType)
        if history:
            return {"difficulty": history[0].nextDifficulty}
        return {"difficulty": 1}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))