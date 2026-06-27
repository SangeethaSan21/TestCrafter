"""
Project Models
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    test_cases_count: int = 0


class TestCaseSave(BaseModel):
    project_id: str
    test_case: dict