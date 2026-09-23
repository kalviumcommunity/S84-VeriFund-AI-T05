from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "ADVISOR"

class UserResponse(UserBase):
    id: uuid.UUID
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True
