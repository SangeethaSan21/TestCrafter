"""
Database Service using SQLAlchemy - COMPLETE VERSION
"""

from sqlalchemy.orm import Session
from database.models import User, Project, TestCase, get_db, init_db
import json
from typing import List, Optional
from datetime import datetime


class DatabaseService:
    """Database operations service"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== USER OPERATIONS ====================
    
    def create_user(self, username: str, email: str, hashed_password: str, full_name: str = None) -> User:
        """Create new user"""
        user = User(
            username=username,
            email=email,
            password=hashed_password,
            full_name=full_name
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Find user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Find user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def update_user(self, user_id: str, **kwargs) -> Optional[User]:
        """Update user information"""
        user = self.get_user_by_id(user_id)
        if user:
            for key, value in kwargs.items():
                if hasattr(user, key) and value is not None:
                    setattr(user, key, value)
            self.db.commit()
            self.db.refresh(user)
        return user
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user (and cascade delete all projects)"""
        user = self.get_user_by_id(user_id)
        if user:
            self.db.delete(user)
            self.db.commit()
            return True
        return False
    
    def get_all_users(self) -> List[User]:
        """Get all users (admin function)"""
        return self.db.query(User).all()
    
    # ==================== PROJECT OPERATIONS ====================
    
    def create_project(self, user_id: str, name: str, description: str = None) -> Project:
        """Create new project"""
        project = Project(
            name=name,
            description=description,
            user_id=user_id
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project
    
    def get_user_projects(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        return self.db.query(Project).filter(Project.user_id == user_id).order_by(Project.created_at.desc()).all()
    
    def get_project(self, project_id: str) -> Optional[Project]:
        """Get project by ID"""
        return self.db.query(Project).filter(Project.id == project_id).first()
    
    def update_project(self, project_id: str, name: str = None, description: str = None) -> Optional[Project]:
        """Update project"""
        project = self.get_project(project_id)
        if project:
            if name is not None:
                project.name = name
            if description is not None:
                project.description = description
            self.db.commit()
            self.db.refresh(project)
        return project
    
    def delete_project(self, project_id: str) -> bool:
        """Delete project (and cascade delete all test cases)"""
        project = self.get_project(project_id)
        if project:
            self.db.delete(project)
            self.db.commit()
            return True
        return False
    
    def get_project_count(self, user_id: str) -> int:
        """Get count of projects for a user"""
        return self.db.query(Project).filter(Project.user_id == user_id).count()
    
    # ==================== TEST CASE OPERATIONS ====================
    
    def save_test_case(self, project_id: str, test_case: dict) -> TestCase:
        """Save test case to project"""
        test_case_obj = TestCase(
            project_id=project_id,
            test_case_data=json.dumps(test_case)
        )
        self.db.add(test_case_obj)
        self.db.commit()
        self.db.refresh(test_case_obj)
        return test_case_obj
    
    def get_project_test_cases(self, project_id: str) -> List[dict]:
        """Get all test cases for a project"""
        test_cases = self.db.query(TestCase).filter(
            TestCase.project_id == project_id
        ).order_by(TestCase.created_at.desc()).all()
        
        return [
            {
                'id': tc.id,
                'test_case': json.loads(tc.test_case_data),
                'created_at': tc.created_at.isoformat()
            }
            for tc in test_cases
        ]
    
    def get_test_case(self, test_case_id: str) -> Optional[TestCase]:
        """Get test case by ID"""
        return self.db.query(TestCase).filter(TestCase.id == test_case_id).first()
    
    def update_test_case(self, test_case_id: str, test_case: dict) -> Optional[TestCase]:
        """Update test case"""
        test_case_obj = self.get_test_case(test_case_id)
        if test_case_obj:
            test_case_obj.test_case_data = json.dumps(test_case)
            self.db.commit()
            self.db.refresh(test_case_obj)
        return test_case_obj
    
    def delete_test_case(self, test_case_id: str) -> bool:
        """Delete test case"""
        test_case = self.get_test_case(test_case_id)
        if test_case:
            self.db.delete(test_case)
            self.db.commit()
            return True
        return False
    
    def delete_all_project_test_cases(self, project_id: str) -> int:
        """Delete all test cases in a project"""
        count = self.db.query(TestCase).filter(TestCase.project_id == project_id).delete()
        self.db.commit()
        return count
    
    def get_test_case_count(self, project_id: str) -> int:
        """Get count of test cases in a project"""
        return self.db.query(TestCase).filter(TestCase.project_id == project_id).count()
    
    # ==================== STATISTICS & REPORTING ====================
    
    def get_user_statistics(self, user_id: str) -> dict:
        """Get statistics for a user"""
        projects = self.get_user_projects(user_id)
        total_test_cases = sum(len(p.test_cases) for p in projects)
        
        return {
            'total_projects': len(projects),
            'total_test_cases': total_test_cases,
            'projects_with_test_cases': len([p for p in projects if len(p.test_cases) > 0]),
            'average_test_cases_per_project': total_test_cases / len(projects) if projects else 0
        }
    
    def get_recent_projects(self, user_id: str, limit: int = 5) -> List[Project]:
        """Get recent projects for a user"""
        return self.db.query(Project).filter(
            Project.user_id == user_id
        ).order_by(Project.created_at.desc()).limit(limit).all()
    
    def search_projects(self, user_id: str, search_term: str) -> List[Project]:
        """Search projects by name or description"""
        return self.db.query(Project).filter(
            Project.user_id == user_id,
            (Project.name.contains(search_term)) | (Project.description.contains(search_term))
        ).all()
    
    # ==================== BULK OPERATIONS ====================
    
    def bulk_save_test_cases(self, project_id: str, test_cases: List[dict]) -> List[TestCase]:
        """Save multiple test cases at once"""
        test_case_objects = [
            TestCase(
                project_id=project_id,
                test_case_data=json.dumps(tc)
            )
            for tc in test_cases
        ]
        
        self.db.add_all(test_case_objects)
        self.db.commit()
        
        for obj in test_case_objects:
            self.db.refresh(obj)
        
        return test_case_objects
    
    def export_project_data(self, project_id: str) -> dict:
        """Export all project data including test cases"""
        project = self.get_project(project_id)
        if not project:
            return None
        
        test_cases = self.get_project_test_cases(project_id)
        
        return {
            'project': {
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat()
            },
            'test_cases': test_cases,
            'total_test_cases': len(test_cases)
        }
    
    # ==================== DATABASE MAINTENANCE ====================
    
    def cleanup_orphaned_test_cases(self) -> int:
        """Remove test cases without a project (maintenance)"""
        # Get all project IDs
        project_ids = [p.id for p in self.db.query(Project).all()]
        
        # Delete test cases not in any project
        count = self.db.query(TestCase).filter(
            ~TestCase.project_id.in_(project_ids)
        ).delete(synchronize_session=False)
        
        self.db.commit()
        return count
    
    def get_database_stats(self) -> dict:
        """Get overall database statistics"""
        return {
            'total_users': self.db.query(User).count(),
            'total_projects': self.db.query(Project).count(),
            'total_test_cases': self.db.query(TestCase).count(),
            'users_with_projects': self.db.query(User).join(Project).distinct().count()
        }


# ==================== HELPER FUNCTIONS ====================

def get_database_service(db: Session = None) -> DatabaseService:
    """Get DatabaseService instance"""
    if db is None:
        db = next(get_db())
    return DatabaseService(db)


def initialize_database():
    """Initialize the database - create tables"""
    from database.models import init_db
    init_db()
    print("✅ Database initialized successfully!")


# ==================== EXAMPLE USAGE ====================

if __name__ == "__main__":
    # This is for testing the database service directly
    initialize_database()
    
    # Create a test session
    from database.models import SessionLocal
    db = SessionLocal()
    db_service = DatabaseService(db)
    
    # Example: Get database stats
    stats = db_service.get_database_stats()
    print(f"Database Stats: {stats}")
    
    db.close()