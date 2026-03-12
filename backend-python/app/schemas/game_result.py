from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

GAME_TYPES = Literal[
    "rapid_naming",
    "sound_builder",
    "nback",
    "clap_trap",
    "stroop",
]


class SessionStartRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    userId: str = Field(..., min_length=1)
    gameType: GAME_TYPES
    difficulty: int = Field(..., ge=1, le=5)


class SessionStartResponse(BaseModel):
    sessionId: str
    gameType: str
    difficulty: int
    startedAt: datetime


class SessionEndRequest(BaseModel):
    sessionId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    gameType: GAME_TYPES
    difficulty: int = Field(..., ge=1, le=5)
    score: int = Field(..., ge=0)
    accuracy: float
    avgReactionTimeMs: float = Field(..., ge=0)
    totalAttempts: int = Field(..., ge=0)
    correctAttempts: int = Field(..., ge=0)
    durationSeconds: float = Field(..., ge=0)

    @field_validator("accuracy")
    @classmethod
    def accuracy_range(cls, v: float) -> float:
        if not 0 <= v <= 1:
            raise ValueError("accuracy must be between 0 and 1")
        return round(v, 4)


class SessionEndResponse(BaseModel):
    nextDifficulty: int = Field(..., ge=1, le=5)
    message: str
    summary: dict


class GameHistoryItem(BaseModel):
    sessionId: str
    gameType: str
    score: int
    accuracy: float
    difficulty: int = Field(..., ge=1, le=5)
    nextDifficulty: int = Field(..., ge=1, le=5)
    playedAt: datetime

    @field_validator("accuracy")
    @classmethod
    def accuracy_range(cls, v: float) -> float:
        if not 0 <= v <= 1:
            raise ValueError("accuracy must be between 0 and 1")
        return round(v, 4)