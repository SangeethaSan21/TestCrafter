"""
Automation Script Generator Service
"""

from services.llm_service import LLMService

class ScriptGenerator:
    def __init__(self):
        self.llm_service = LLMService()
    
    def generate(self, test_case: dict, language: str, framework: str):
        """Generate automation script from test case"""
        
        script = self.llm_service.generate_script(
            test_case,
            language,
            framework
        )
        
        return script