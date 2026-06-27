"""
JWT Authentication Handler - Fixed for bcrypt compatibility
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# FIXED: Updated bcrypt configuration for newer versions
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,  # Specify rounds explicitly
    bcrypt__ident="2b"   # Use 2b identifier for compatibility
)

security = HTTPBearer()


class AuthHandler:
    """Handle authentication operations"""
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password - with length check"""
        # FIXED: Truncate password if longer than 72 bytes (bcrypt limit)
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against hash - with length check"""
        # FIXED: Truncate password if longer than 72 bytes
        if len(plain_password.encode('utf-8')) > 72:
            plain_password = plain_password[:72]
        return pwd_context.verify(plain_password, hashed_password)
    
    def encode_token(self, user_id: str, email: str) -> str:
        """Create JWT token"""
        payload = {
            'exp': datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            'iat': datetime.utcnow(),
            'sub': user_id,
            'email': email
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    def decode_token(self, token: str) -> dict:
        """Decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail='Invalid token')
    
    def auth_wrapper(self, auth: HTTPAuthorizationCredentials = Security(security)) -> dict:
        """Verify token from request"""
        return self.decode_token(auth.credentials)


auth_handler = AuthHandler()