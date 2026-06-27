"""
Authentication Routes - Updated for SQLAlchemy
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from models.user import UserSignup, UserLogin, UserResponse, Token
from auth.auth_handler import auth_handler
from database.models import get_db
from database.db import DatabaseService

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/signup", response_model=Token)
async def signup(user: UserSignup, db: Session = Depends(get_db)):
    """Register new user"""
    db_service = DatabaseService(db)
    
    # Check if user exists
    if db_service.get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = auth_handler.get_password_hash(user.password)
    
    # Create user
    new_user = db_service.create_user(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    
    # Generate token
    token = auth_handler.encode_token(new_user.id, new_user.email)
    
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            full_name=new_user.full_name,
            created_at=new_user.created_at
        )
    }


@router.post("/login", response_model=Token)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    db_service = DatabaseService(db)
    
    # Find user
    db_user = db_service.get_user_by_email(user.email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not auth_handler.verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token = auth_handler.encode_token(db_user.id, db_user.email)
    
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': UserResponse(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            full_name=db_user.full_name,
            created_at=db_user.created_at
        )
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_data: dict = Depends(auth_handler.auth_wrapper),
    db: Session = Depends(get_db)
):
    """Get current logged-in user"""
    db_service = DatabaseService(db)
    user = db_service.get_user_by_id(user_data['sub'])
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at
    )