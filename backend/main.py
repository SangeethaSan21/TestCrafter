# backend/main.py
"""
TestCrafter Backend API (GroqCloud Version)
Updated with F08: BDD Gherkin Generator
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json  
from dotenv import load_dotenv
from groq import Groq
from models import testcase, automation
from routers import auth, projects
from database.models import init_db

load_dotenv()

app = FastAPI(
    title="TestCrafter API",
    description="AI-powered test case and automation script generator",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    init_db()
    print("✅ Database initialized successfully!")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
if os.getenv("ENVIRONMENT") == "production":
    origins.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ==================== DATA MODELS ====================

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

class ScriptGenerationRequest(BaseModel):
    test_case: TestCase
    language: str
    framework: str

# F08: Gherkin input model
class GherkinInput(BaseModel):
    user_story: str
    feature_name: Optional[str] = ""
    include_scenario_outline: Optional[bool] = False

# ==================== ROUTES ====================

@app.get("/")
async def root():
    return {
        "message": "TestCrafter API is running!",
        "version": "1.0.0",
        "ai_provider": "GroqCloud",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "ai_provider": "GroqCloud"
    }

@app.post("/api/generate-testcases", response_model=List[TestCase])
async def generate_test_cases(requirement: RequirementInput):
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="Groq API key not configured.")
    
    try:
        prompt = f"""You are an expert QA engineer. Generate 3-5 comprehensive test cases for this requirement:

REQUIREMENT: {requirement.user_story}
PRIORITY: {requirement.priority}
TAGS: {', '.join(requirement.tags) if requirement.tags else 'None'}

Generate test cases that cover:
1. Happy path (positive scenario)
2. Negative scenarios (invalid inputs, errors)
3. Edge cases (boundary conditions)

Return ONLY a valid JSON array with this EXACT structure (no markdown, no extra text):
[
  {{
    "id": "TC-001",
    "title": "Clear, specific test case title",
    "preconditions": "What must be true before test execution",
    "steps": [
      "Step 1: Action to perform",
      "Step 2: Next action",
      "Step 3: Continue..."
    ],
    "expected_result": "What should happen after all steps",
    "priority": "{requirement.priority}",
    "test_data": "Specific test data if needed (e.g., Username: test@example.com)"
  }}
]

IMPORTANT: Return ONLY the JSON array, nothing else."""

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert QA engineer. Return only valid JSON arrays. No markdown, no explanations."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2000,
            top_p=1,
            stream=False
        )
        
        content = chat_completion.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        test_cases_data = json.loads(content)
        test_cases = [TestCase(**tc) for tc in test_cases_data]
        return test_cases
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        error_msg = str(e)
        if "model_decommissioned" in error_msg:
            raise HTTPException(status_code=500, detail="The AI model is no longer available.")
        raise HTTPException(status_code=500, detail=f"Error generating test cases: {error_msg}")


@app.post("/api/generate-script")
async def generate_automation_script(request: ScriptGenerationRequest):
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    
    try:
        tc = request.test_case
        steps_text = "\n".join([f"{i+1}. {step}" for i, step in enumerate(tc.steps)])
        
        prompt = f"""Generate a complete, production-ready {request.language} automation script using {request.framework}.

TEST CASE: {tc.title}
TEST ID: {tc.id}
PRIORITY: {tc.priority}

PRECONDITIONS:
{tc.preconditions}

TEST STEPS:
{steps_text}

EXPECTED RESULT:
{tc.expected_result}

TEST DATA:
{tc.test_data or 'Not specified'}

Generate a complete script with:
- Proper imports and setup
- Clear comments for each step
- Assertions for expected results
- Setup and teardown methods
- Exception handling
- Best practices for {request.framework}

Return ONLY the code, no explanations, no markdown."""

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are an expert automation engineer specializing in {request.language} and {request.framework}. Return only code, no markdown."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=2000,
            stream=False
        )
        
        script = chat_completion.choices[0].message.content.strip()
        if script.startswith("```"):
            lines = script.split("\n")
            script = "\n".join(lines[1:-1])
        
        return {
            "language": request.language,
            "framework": request.framework,
            "script": script,
            "test_case_id": tc.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating script: {str(e)}")


# ==================== F08: BDD GHERKIN GENERATOR ====================

@app.post("/api/generate-gherkin")
async def generate_gherkin(request: GherkinInput):
    """Generate BDD Gherkin .feature file from a user story"""
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    try:
        feature_name = request.feature_name.strip() if request.feature_name else "Feature"
        outline_instruction = ""
        if request.include_scenario_outline:
            outline_instruction = "\nAlso include one 'Scenario Outline' with an 'Examples' table for data-driven testing."

        prompt = f"""You are a BDD expert. Generate a complete Gherkin .feature file for the following user story.

USER STORY: {request.user_story}
FEATURE NAME: {feature_name}

Requirements:
- Write a Feature description (2-3 lines)
- Generate 3-5 Scenarios covering: happy path, negative cases, edge cases
- Use Given / When / Then / And / But keywords correctly
- Steps must be clear, specific, and reusable
- Use proper Gherkin indentation (2 spaces){outline_instruction}

Return ONLY the raw Gherkin content. No markdown, no code blocks, no explanations.

Example format:
Feature: User Login
  As a registered user
  I want to log in with my credentials
  So that I can access my account

  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When the user enters valid email "test@example.com"
    And the user enters valid password "Test123!"
    And the user clicks the login button
    Then the user should be redirected to the dashboard
    And the welcome message should be displayed"""

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a BDD Gherkin expert. Return only raw Gherkin feature file content. No markdown, no code blocks."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.6,
            max_tokens=2000,
            stream=False
        )

        gherkin = chat_completion.choices[0].message.content.strip()

        # Strip markdown code fences if model adds them
        if gherkin.startswith("```"):
            lines = gherkin.split("\n")
            gherkin = "\n".join(lines[1:-1]).strip()

        # Count scenarios
        scenario_count = gherkin.count("Scenario:")
        scenario_count += gherkin.count("Scenario Outline:")

        return {
            "feature_file": gherkin,
            "scenario_count": scenario_count,
            "feature_name": feature_name
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating Gherkin: {str(e)}")


@app.post("/api/export/csv")
async def export_to_csv(test_cases: List[TestCase]):
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)