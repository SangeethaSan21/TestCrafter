"""
Input Validation Utilities
"""

def validate_requirement(requirement: str) -> bool:
    """Validate requirement input"""
    if not requirement or len(requirement.strip()) < 10:
        return False
    return True

def validate_language(language: str) -> bool:
    """Validate programming language"""
    valid_languages = ['Python', 'JavaScript', 'Java', 'C#']
    return language in valid_languages

def validate_framework(framework: str) -> bool:
    """Validate test framework"""
    valid_frameworks = ['Selenium', 'Playwright', 'CodeceptJS']
    return framework in valid_frameworks