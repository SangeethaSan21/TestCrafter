"""
Project Management Routes - Updated for SQLAlchemy
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from models.project import ProjectCreate, ProjectResponse, TestCaseSave
from auth.auth_handler import auth_handler
from database.models import get_db
from database.db import DatabaseService

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    user_data: dict = Depends(auth_handler.auth_wrapper),
    db: Session = Depends(get_db)
):
    """Create new project"""
    db_service = DatabaseService(db)
    user_id = user_data['sub']
    
    new_project = db_service.create_project(
        user_id=user_id,
        name=project.name,
        description=project.description
    )
    
    return ProjectResponse(
        id=new_project.id,
        name=new_project.name,
        description=new_project.description,
        created_at=new_project.created_at,
        test_cases_count=0
    )


@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    user_data: dict = Depends(auth_handler.auth_wrapper),
    db: Session = Depends(get_db)
):
    """Get all projects for current user"""
    db_service = DatabaseService(db)
    user_id = user_data['sub']
    projects = db_service.get_user_projects(user_id)
    
    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            created_at=p.created_at,
            test_cases_count=len(p.test_cases)
        )
        for p in projects
    ]


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    user_data: dict = Depends(auth_handler.auth_wrapper),
    db: Session = Depends(get_db)
):
    """Get project details"""
    db_service = DatabaseService(db)
    project = db_service.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify ownership
    if project.user_id != user_data['sub']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get test cases
    test_cases = db_service.get_project_test_cases(project_id)
    
    return {
        'id': project.id,
        'name': project.name,
        'description': project.description,
        'created_at': project.created_at,
        'test_cases': test_cases
    }


@router.post("/test-cases")
async def save_test_case(
    data: TestCaseSave,
    user_data: dict = Depends(auth_handler.auth_wrapper),
    db: Session = Depends(get_db)
):
    """Save test case to project"""
    db_service = DatabaseService(db)
    project = db_service.get_project(data.project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify ownership
    if project.user_id != user_data['sub']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    saved_tc = db_service.save_test_case(data.project_id, data.test_case)
    
    return {
        'id': saved_tc.id,
        'project_id': saved_tc.project_id,
        'created_at': saved_tc.created_at
    }


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user_data: dict = Depends(auth_handler.auth_wrapper),
    db: Session = Depends(get_db)
):
    """Delete project"""
    db_service = DatabaseService(db)
    project = db_service.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.user_id != user_data['sub']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db_service.delete_project(project_id)
    
    return {"message": "Project deleted successfully"}