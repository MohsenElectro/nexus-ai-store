from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.schemas.user import UserRegister, UserLogin, Token, UserOut
from app.services.wallet_service import wallet_service

router = APIRouter()

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
