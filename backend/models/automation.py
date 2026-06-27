"""
Automation Script Generation Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.script_generator import ScriptGenerator

router = APIRouter(prefix="/api/automation", tags=["automation"])

class TestCase(BaseModel):
    id: str
    title: str
    preconditions: str
    steps: List[str]
    expected_result: str
    priority: str
    test_data: str = None

class ScriptRequest(BaseModel):
    test_case: TestCase
    language: str
    framework: str

@router.post("/generate-script")
async def generate_script(request: ScriptRequest):
    """Generate automation script from test case"""
    try:
        generator = ScriptGenerator()
        script = generator.generate(
            request.test_case.dict(),
            request.language,
            request.framework
        )
        
        return {
            "language": request.language,
            "framework": request.framework,
            "script": script,
            "test_case_id": request.test_case.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))