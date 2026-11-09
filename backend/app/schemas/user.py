from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.user import UserRole

class UserRegister(BaseModel):
    phone_number: Optional[str] = Field(None, json_schema_extra={"example": "09121234567"})
    email: Optional[str] = Field(None, json_schema_extra={"example": "user@example.com"})
    password: str = Field(..., min_length=6, json_schema_extra={"example": "SecurePass123!"})
    full_name: Optional[str] = Field(None, json_schema_extra={"example": "محمد رضایی"})

class UserLogin(BaseModel):
    # Can be either email or phone number
    username: str = Field(..., json_schema_extra={"example": "09121234567"})
    password: str = Field(..., json_schema_extra={"example": "SecurePass123!"})

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: Optional[str] = None
    email: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime
