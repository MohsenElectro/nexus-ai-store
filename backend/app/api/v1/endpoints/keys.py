from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.core.security import generate_api_key
from app.models.user import User
from app.models.api_key import ApiKey, TokenUsageLog
from app.schemas.api_key import ApiKeyCreate, ApiKeyOut, ApiKeyCreatedResponse, TokenUsageLogOut

router = APIRouter()

@router.get("/", response_model=List[ApiKeyOut])
async def list_my_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ApiKey).where(ApiKey.user_id == current_user.id).order_by(ApiKey.created_at.desc())
    )
    return res.scalars().all()

@router.post("/", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_new_key(
    key_in: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    full_key, prefix, key_hash = generate_api_key()

    api_key_record = ApiKey(
        user_id=current_user.id,
        name=key_in.name,
        prefix=prefix,
        key_hash=key_hash,
        spend_limit_toman=key_in.spend_limit_toman,
    )
    db.add(api_key_record)
    await db.commit()
    await db.refresh(api_key_record)

    # Return key object with full plaintext key included once
    return ApiKeyCreatedResponse(
        id=api_key_record.id,
        name=api_key_record.name,
        prefix=api_key_record.prefix,
        spend_limit_toman=api_key_record.spend_limit_toman,
        total_spent_toman=api_key_record.total_spent_toman,
        is_active=api_key_record.is_active,
        created_at=api_key_record.created_at,
        last_used_at=api_key_record.last_used_at,
        api_key=full_key,
    )

@router.delete("/{key_id}")
async def deactivate_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    api_key = res.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="کلید یافت نشد.")

    api_key.is_active = False
    await db.commit()
    return {"success": True, "message": "کلید API با موفقیت غیرفعال گردید."}

@router.get("/usage", response_model=List[TokenUsageLogOut])
async def get_usage_logs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(TokenUsageLog)
        .where(TokenUsageLog.user_id == current_user.id)
        .order_by(TokenUsageLog.created_at.desc())
        .limit(100)
    )
    return res.scalars().all()
