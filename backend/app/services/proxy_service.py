import json
import time
from typing import AsyncGenerator, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import tiktoken

from app.core.config import settings
from app.models.user import User
from app.models.api_key import ApiKey, TokenUsageLog
from app.models.wallet import TransactionType
from app.services.wallet_service import wallet_service

# Official pricing approximation in Tomans per 1K tokens (including markup)
MODEL_PRICING_TOMAN_PER_1K = {
    # GPT-4o: ~$2.5 / 1M input (~175 Toman/1K), ~$10 / 1M output (~700 Toman/1K)
    "gpt-4o": {"input": 250, "output": 900},
    "gpt-4o-mini": {"input": 20, "output": 80},
    # Claude 3.5 Sonnet
    "claude-3-5-sonnet": {"input": 300, "output": 1200},
    # DeepSeek V3 / R1 (Very economical)
    "deepseek-chat": {"input": 15, "output": 40},
    "deepseek-reasoner": {"input": 35, "output": 120},
    # Google Gemini Models
    "gemini-1.5-flash": {"input": 12, "output": 35},
    "gemini-1.5-pro": {"input": 90, "output": 350},
    "gemini-2.0-flash": {"input": 15, "output": 45},
}

class ProxyService:
    @staticmethod
    def get_token_encoder(model: str):
        try:
            return tiktoken.encoding_for_model(model)
        except Exception:
            return tiktoken.get_encoding("cl100k_base")

    @classmethod
    def estimate_tokens(cls, text: str, model: str = "gpt-4o") -> int:
        encoder = cls.get_token_encoder(model)
        return len(encoder.encode(text))

    @classmethod
    def calculate_cost_toman(cls, model: str, prompt_tokens: int, completion_tokens: int) -> int:
        rates = MODEL_PRICING_TOMAN_PER_1K.get(model, {"input": 150, "output": 500})
        cost_input = (prompt_tokens / 1000.0) * rates["input"]
        cost_output = (completion_tokens / 1000.0) * rates["output"]
        total = int((cost_input + cost_output) * settings.AI_MARKUP_RATIO)
        return max(1, total)  # minimum 1 Toman

    @classmethod
    async def forward_streaming_request(
        cls,
        db_factory,
        user_id: int,
        api_key_id: int,
        model: str,
        request_body: Dict[str, Any],
    ) -> AsyncGenerator[bytes, None]:
        """
        Streams SSE chunks to client and counts tokens, deducting balance when stream finishes.
        """
        # Minimum balance safety check before opening stream
        async with db_factory() as session:
            wallet = await wallet_service.get_or_create_wallet(session, user_id)
            if wallet.balance_toman < 500:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="حداقل موجودی برای ارسال درخواست هوش مصنوعی ۵۰۰ تومان است. لطفاً کیف پول خود را شارژ کنید.",
                )

        # Estimate prompt tokens from messages
        prompt_text = " ".join([m.get("content", "") for m in request_body.get("messages", []) if isinstance(m.get("content"), str)])
        prompt_tokens = cls.estimate_tokens(prompt_text, model)
        completion_text_chunks = []

        # If user has configured an upstream key, forward it; otherwise, use mock response engine for testing
        upstream_key = settings.UPSTREAM_OPENAI_KEYS[0] if settings.UPSTREAM_OPENAI_KEYS else None

        if upstream_key:
            headers = {
                "Authorization": f"Bearer {upstream_key}",
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{settings.UPSTREAM_OPENAI_BASE}/chat/completions",
                    headers=headers,
                    json=request_body,
                ) as upstream_resp:
                    if upstream_resp.status_code != 200:
                        err_content = await upstream_resp.aread()
                        raise HTTPException(status_code=upstream_resp.status_code, detail=err_content.decode("utf-8"))

                    async for chunk in upstream_resp.aiter_bytes():
                        yield chunk
                        # Extract completion tokens if text
                        try:
                            decoded = chunk.decode("utf-8")
                            for line in decoded.split("\n"):
                                if line.startswith("data: ") and line != "data: [DONE]":
                                    data_obj = json.loads(line[6:])
                                    delta = data_obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                    if delta:
                                        completion_text_chunks.append(delta)
                        except Exception:
                            pass
        else:
            # Mock generator for local testing without requiring real credit cards upfront
            simulated_reply = f"سلام! این پاسخ مستقیم از پراکسی هوش مصنوعی AI Nexus Store با مدل {model} است. سیستم شمارش توکن و کسر لحظه‌ای کیف پول فعال است."
            words = simulated_reply.split(" ")
            for w in words:
                chunk_payload = {
                    "id": f"chatcmpl-{int(time.time())}",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": model,
                    "choices": [{"index": 0, "delta": {"content": w + " "}, "finish_reason": None}],
                }
                yield f"data: {json.dumps(chunk_payload, ensure_ascii=False)}\n\n".encode("utf-8")
                completion_text_chunks.append(w + " ")
            
            # Final chunk
            yield b"data: [DONE]\n\n"

        # Stream ended: calculate usage and deduct
        completion_full = "".join(completion_text_chunks)
        completion_tokens = cls.estimate_tokens(completion_full, model)
        total_tokens = prompt_tokens + completion_tokens
        cost_toman = cls.calculate_cost_toman(model, prompt_tokens, completion_tokens)

        # Atomic deduction in a fresh session
        async with db_factory() as session:
            await wallet_service.debit_wallet_atomic(
                db=session,
                user_id=user_id,
                amount_toman=cost_toman,
                tx_type=TransactionType.API_USAGE,
                description=f"مصرف {total_tokens} توکن با مدل {model}",
            )
            # Log usage
            usage_log = TokenUsageLog(
                api_key_id=api_key_id,
                user_id=user_id,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cost_toman=cost_toman,
            )
            session.add(usage_log)
            await session.commit()

proxy_service = ProxyService()
