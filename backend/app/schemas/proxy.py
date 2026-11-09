from typing import List, Optional, Any, Union
from pydantic import BaseModel, Field
import time

class ChatMessage(BaseModel):
    role: str = Field(..., json_schema_extra={"example": "user"})
    content: Union[str, List[Any]] = Field(..., json_schema_extra={"example": "سلام، چطور می‌توانی به من کمک کنی؟"})

class ChatCompletionRequest(BaseModel):
    model: str = Field(..., json_schema_extra={"example": "gpt-4o"})
    messages: List[ChatMessage]
    stream: bool = Field(default=False)
    temperature: Optional[float] = Field(default=1.0)
    max_tokens: Optional[int] = Field(default=None)
    top_p: Optional[float] = Field(default=1.0)

class ModelObject(BaseModel):
    id: str
    object: str = "model"
    created: int = Field(default_factory=lambda: int(time.time()))
    owned_by: str = "ai-nexus-store"

class ModelListResponse(BaseModel):
    object: str = "list"
    data: List[ModelObject]
