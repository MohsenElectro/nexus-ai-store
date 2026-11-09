from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.services.telegram_bot_service import telegram_bot_service

router = APIRouter()


class BotSimulationRequest(BaseModel):
    telegram_id: int = Field(default=99887766, description="شناسه عددی کاربر تلگرام")
    username: str = Field(default="ai_buyer", description="نام کاربری تلگرام")
    first_name: str = Field(default="کاربر تلگرام", description="نام نمایشی کاربر")
    text: Optional[str] = Field(default=None, description="متن پیام یا دستور مانند /start")
    callback_data: Optional[str] = Field(default=None, description="دیتای دکمه شیشه‌ای کلیک‌شده")


@router.get("/status")
async def get_telegram_bot_status():
    return {
        "bot_username": settings.TELEGRAM_BOT_USERNAME,
        "token_configured": bool(settings.TELEGRAM_BOT_TOKEN),
        "webhook_endpoint": f"{settings.API_V1_STR}/telegram/webhook",
        "bot_link": f"https://t.me/{settings.TELEGRAM_BOT_USERNAME.lstrip('@')}",
    }


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_telegram_bot_api_secret_token: Optional[str] = Header(default=None),
):
    """
    Production webhook endpoint for Telegram Bot API updates.
    Verifies X-Telegram-Bot-Api-Secret-Token when provided.
    """
    if (
        x_telegram_bot_api_secret_token is not None
        and settings.TELEGRAM_WEBHOOK_SECRET
        and x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="توکن امنیتی وب‌هوک تلگرام نامعتبر است.",
        )

    update_data: Dict[str, Any] = await request.json()
    result = await telegram_bot_service.handle_update(db=db, update=update_data)
    return result


@router.post("/simulate")
async def simulate_telegram_interaction(
    sim: BotSimulationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Interactive simulator endpoint allowing admins and tests to interact with the
    Telegram storefront bot directly from the web dashboard or test suite.
    """
    from_user = {
        "id": sim.telegram_id,
        "is_bot": False,
        "first_name": sim.first_name,
        "username": sim.username,
    }
    chat = {"id": sim.telegram_id, "type": "private"}

    if sim.callback_data:
        update_payload = {
            "update_id": 10001,
            "callback_query": {
                "id": "sim_cb_1",
                "from": from_user,
                "message": {"message_id": 1, "chat": chat},
                "data": sim.callback_data,
            },
        }
    else:
        update_payload = {
            "update_id": 10000,
            "message": {
                "message_id": 1,
                "from": from_user,
                "chat": chat,
                "text": sim.text or "/start",
            },
        }

    return await telegram_bot_service.handle_update(db=db, update=update_payload)
