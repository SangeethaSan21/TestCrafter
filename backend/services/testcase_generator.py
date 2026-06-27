"""
Test Case Generator Service
"""

from services.llm_service import LLMService

class TestCaseGenerator:
    def __init__(self):
        self.llm_service = LLMService()
    
    def generate(self, requirement: str, priority: str, tags: list = None):
        """Generate test cases from requirement"""
        
        test_cases_data = self.llm_service.generate_test_cases(
            requirement, 
            priority, 
            tags
        )
        
        return test_cases_data