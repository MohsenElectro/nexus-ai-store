from typing import AsyncGenerator, Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_api_key
from app.models.user import User, UserRole
from app.models.api_key import ApiKey

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Accept token either from OAuth2 form or Bearer header
    raw_token = token
    if not raw_token and auth_header:
        raw_token = auth_header.credentials
        
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="احراز هویت انجام نشده است. لطفاً ابتدا وارد حساب کاربری خود شوید.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(raw_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="توکن نامعتبر است.",
            )
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="توکن ورود منقضی شده یا نامعتبر است.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="حساب کاربری شما غیرفعال است.")
    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="دسترسی غیرمجاز. این بخش مخصوص مدیران سیستم است.",
        )
    return current_user

async def get_api_key_auth(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> Tuple[User, ApiKey]:
    """
    Validates standard OpenAI API Key header: 'Authorization: Bearer sk-live-...'
    """
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="کلید API الزامی است. لطفاً هدر Authorization: Bearer sk-live-... را ارسال کنید.",
        )
    
    raw_key = auth_header.credentials
    if not raw_key.startswith("sk-live-"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="فرمت کلید نامعتبر است. کلیدها با پیشوند sk-live- شروع می‌شوند.",
        )
    
    hashed = hash_api_key(raw_key)
    result = await db.execute(select(ApiKey).where(ApiKey.key_hash == hashed))
    api_key = result.scalar_one_or_none()
    
    if not api_key or not api_key.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="کلید API نامعتبر است یا غیرفعال شده است.",
        )
    
    user_res = await db.execute(select(User).where(User.id == api_key.user_id))
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="حساب کاربری متصل به این کلید غیرفعال است.",
        )
        
    return user, api_key
