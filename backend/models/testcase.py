"""
Test Case Generation Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.testcase_generator import TestCaseGenerator

router = APIRouter(prefix="/api/testcases", tags=["testcases"])

class RequirementInput(BaseModel):
    user_story: str
    priority: Optional[str] = "Medium"
    tags: Optional[List[str]] = []

class TestCase(BaseModel):
    id: str
    title: str
    preconditions: str
    steps: List[str]
    expected_result: str
    priority: str
    test_data: Optional[str] = None

@router.post("/generate", response_model=List[TestCase])
async def generate_test_cases(requirement: RequirementInput):
    """Generate test cases from requirement"""
    try:
        generator = TestCaseGenerator()
        test_cases = generator.generate(
            requirement.user_story,
            requirement.priority,
            requirement.tags
        )
        return test_cases
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export/csv")
async def export_csv(test_cases: List[TestCase]):
    """Export test cases to CSV"""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=['ID', 'Title', 'Preconditions', 'Steps', 'Expected Result', 'Priority', 'Test Data']
    )
    writer.writeheader()
    
    for tc in test_cases:
        writer.writerow({
            'ID': tc.id,
            'Title': tc.title,
            'Preconditions': tc.preconditions,
            'Steps': ' | '.join(tc.steps),
            'Expected Result': tc.expected_result,
            'Priority': tc.priority,
            'Test Data': tc.test_data or ''
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=test_cases.csv"}
    )