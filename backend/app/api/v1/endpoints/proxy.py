import time
import json
from typing import Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.api.deps import get_api_key_auth
from app.models.user import User
from app.models.api_key import ApiKey
from app.schemas.proxy import ChatCompletionRequest, ModelListResponse, ModelObject
from app.services.proxy_service import proxy_service, MODEL_PRICING_TOMAN_PER_1K

router = APIRouter()

@router.get("/v1/models", response_model=ModelListResponse)
async def list_available_models():
    """
    OpenAI-compatible models catalog endpoint.
    """
    models = [
        ModelObject(id=m_id, owned_by="ai-nexus-store")
        for m_id in MODEL_PRICING_TOMAN_PER_1K.keys()
    ]
    return ModelListResponse(data=models)

@router.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    auth: Tuple[User, ApiKey] = Depends(get_api_key_auth),
):
    """
    Official OpenAI-compatible chat completion proxy.
    Accepts standard OpenAI payloads, streams or returns completions,
    and atomically deducts token costs from user's wallet.
    """
    user, api_key = auth

    # Check model validity
    if request.model not in MODEL_PRICING_TOMAN_PER_1K:
        # Default fallback or allow dynamic models
        pass

    req_dict = request.model_dump(exclude_none=True)

    if request.stream:
        # Return SSE streaming response
        return StreamingResponse(
            proxy_service.forward_streaming_request(
                db_factory=AsyncSessionLocal,
                user_id=user.id,
                api_key_id=api_key.id,
                model=request.model,
                request_body=req_dict,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        # Non-streaming request
        # Collect streaming generator into a complete response
        collected_chunks = []
        async for chunk in proxy_service.forward_streaming_request(
            db_factory=AsyncSessionLocal,
            user_id=user.id,
            api_key_id=api_key.id,
            model=request.model,
            request_body=req_dict,
        ):
            text = chunk.decode("utf-8")
            for line in text.split("\n"):
                if line.startswith("data: ") and line != "data: [DONE]":
                    try:
                        data_obj = json.loads(line[6:])
                        delta = data_obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if delta:
                            collected_chunks.append(delta)
                    except Exception:
                        pass

        full_content = "".join(collected_chunks)
        return {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": full_content},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": proxy_service.estimate_tokens(" ".join([m.content for m in request.messages if isinstance(m.content, str)]), request.model),
                "completion_tokens": proxy_service.estimate_tokens(full_content, request.model),
                "total_tokens": proxy_service.estimate_tokens(full_content, request.model),
            },
        }
