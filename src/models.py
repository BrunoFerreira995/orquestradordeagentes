from __future__ import annotations
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field

def now() -> datetime:
    return datetime.now(timezone.utc)

class TaskStatus(str, Enum):
    PENDING="PENDING"; READY="READY"; RUNNING="RUNNING"; WAITING="WAITING"
    COMPLETED="COMPLETED"; FAILED="FAILED"; RETRYING="RETRYING"; CANCELLED="CANCELLED"

class Task(BaseModel):
    id: str
    title: str
    description: str
    assigned_worker: str | None = None
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 0
    dependencies: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=now)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    attempts: int = 0
    result: dict[str, Any] | None = None
    error: str | None = None

class OllamaResult(BaseModel):
    content: str = ""
    duration: float = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    status: str = "completed"
    error: str | None = None

