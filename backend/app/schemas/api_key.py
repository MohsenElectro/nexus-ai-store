from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ApiKeyCreate(BaseModel):
    name: str = Field(default="My API Key", json_schema_extra={"example": "پروژه ربات تلگرام یا پنل چت"})
    spend_limit_toman: Optional[int] = Field(None, json_schema_extra={"example": 500000}, description="حداکثر سقف بودجه مجاز برای این کلید به تومان")

class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    prefix: str
    spend_limit_toman: Optional[int]
    total_spent_toman: int
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime]

class ApiKeyCreatedResponse(ApiKeyOut):
    api_key: str = Field(..., description="کلید کامل اختصاصی. این کلید فقط یک‌بار نمایش داده می‌شود، آن را ذخیره کنید.")

class TokenUsageLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_toman: int
    created_at: datetime
