"""
LLM Service - Groq AI Integration
"""

import os
from groq import Groq
import json

class LLMService:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.3-70b-versatile"
    
    def generate_test_cases(self, requirement: str, priority: str, tags: list = None):
        """Generate test cases using Groq AI"""
        
        prompt = f"""Generate 3-5 test cases for:

REQUIREMENT: {requirement}
PRIORITY: {priority}
TAGS: {', '.join(tags) if tags else 'None'}

Return ONLY valid JSON array:
[
  {{
    "id": "TC-001",
    "title": "Test case title",
    "preconditions": "Preconditions",
    "steps": ["Step 1", "Step 2"],
    "expected_result": "Expected result",
    "priority": "{priority}",
    "test_data": "Test data"
  }}
]"""

        response = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a QA expert. Return only JSON."},
                {"role": "user", "content": prompt}
            ],
            model=self.model,
            temperature=0.7,
            max_tokens=2000
        )
        
        content = response.choices[0].message.content.strip()
        
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        return json.loads(content.strip())
    
    def generate_script(self, test_case: dict, language: str, framework: str):
        """Generate automation script"""
        
        steps_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(test_case['steps'])])
        
        prompt = f"""Generate {language} {framework} automation script for:

TEST: {test_case['title']}
STEPS:
{steps_text}

Return ONLY the code, no markdown."""

        response = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are a {language} expert. Return only code."},
                {"role": "user", "content": prompt}
            ],
            model=self.model,
            temperature=0.5,
            max_tokens=2000
        )
        
        script = response.choices[0].message.content.strip()
        
        if script.startswith("```"):
            lines = script.split("\n")
            script = "\n".join(lines[1:-1])
        
        return script