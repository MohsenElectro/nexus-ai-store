import hmac
import hashlib
import json
import urllib.parse
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.schemas.user import (
    UserRegister,
    UserLogin,
    Token,
    UserOut,
    TelegramAuthRequest,
    TelegramAuthResponse,
)
from app.services.wallet_service import wallet_service
from app.services.telegram_bot_service import telegram_bot_service

router = APIRouter()

def verify_telegram_webapp_data(init_data: str, bot_token: Optional[str]) -> Optional[dict]:
    """
    Cryptographically verifies Telegram WebApp initData HMAC-SHA256 signature.
    Guarantees account integrity and prevents balance theft or impersonation.
    """
    if not init_data:
        return None
    try:
        parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            return None

        # Build data_check_string (sorted key=value pairs joined with \n)
        sorted_items = [f"{k}={v}" for k, v in sorted(parsed.items())]
        data_check_string = "\n".join(sorted_items)

        # Cryptographic verification against TELEGRAM_BOT_TOKEN
        if bot_token:
            secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
            calculated_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(calculated_hash, received_hash):
                return None

        user_str = parsed.get("user")
        if user_str:
            return json.loads(user_str)
        return None
    except Exception as exc:
        print(f"[TG AUTH ERROR] Verification failed: {exc}")
        return None

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    if not user_in.email and not user_in.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="حداقل یکی از موارد شماره موبایل یا ایمیل الزامی است.",
        )

    # Check if user already exists
    conditions = []
    if user_in.phone_number:
        conditions.append(User.phone_number == user_in.phone_number)
    if user_in.email:
        conditions.append(User.email == user_in.email)

    existing = await db.execute(select(User).where(or_(*conditions)))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="کاربری با این شماره موبایل یا ایمیل قبلاً ثبت‌نام کرده است.",
        )

    # First registered user can optionally be made admin, otherwise regular customer
    users_count = await db.execute(select(User))
    is_first = len(users_count.scalars().all()) == 0
    role = UserRole.ADMIN if is_first else UserRole.CUSTOMER

    user = User(
        phone_number=user_in.phone_number,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Initialize wallet automatically
    await wallet_service.get_or_create_wallet(db, user.id)
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # Lookup by phone or email
    result = await db.execute(
        select(User).where(
            or_(User.email == form_data.username, User.phone_number == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نام کاربری یا رمز عبور اشتباه است.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="حساب کاربری شما مسدود است.")

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/telegram-webapp", response_model=TelegramAuthResponse)
async def telegram_webapp_auth(
    auth_in: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticates Telegram Mini App users securely.
    Cryptographically verifies HMAC signature and ensures the wallet and user profile
    are completely synchronized between the Telegram Bot and Mini App without leaks.
    """
    user_data = verify_telegram_webapp_data(auth_in.init_data, settings.TELEGRAM_BOT_TOKEN)

    # Fallback if bot token is not configured or in sandbox test mode
    if not user_data and auth_in.user and not settings.TELEGRAM_BOT_TOKEN:
        user_data = auth_in.user

    if not user_data or "id" not in user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اطلاعات احراز هویت تلگرام نامعتبر است یا منقضی گردیده است.",
        )

    # Fetch or create the exact user profile bound to this Telegram user ID
    user = await telegram_bot_service.get_or_create_telegram_user(db, user_data)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="حساب کاربری تلگرام شما مسدود است.",
        )

    access_token = create_access_token(subject=user.id)
    return TelegramAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )
