from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserOut
from app.services.wallet_service import wallet_service

router = APIRouter()

@router.get("/me", response_model=UserOut)
async def read_user_me(
    current_user: User = Depends(get_current_user),
):
    return current_user
