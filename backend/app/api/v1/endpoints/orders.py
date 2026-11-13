from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderOut
from app.services.order_service import order_service

router = APIRouter()

@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_new_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Buys a subscription or special offer using wallet balance.
    Delivers immediately if instant vault stock is available, or queues for manual card top-up.
    """
    order = await order_service.create_order(
        db=db,
        user_id=current_user.id,
        product_id=order_in.product_id,
        target_email=order_in.target_email,
        customer_notes=order_in.customer_notes,
        discount_code_str=order_in.discount_code,
    )
    
    # Reload with items
    res = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return res.scalar_one()

@router.get("/", response_model=List[OrderOut])
async def list_my_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    return res.scalars().all()

@router.get("/{order_id}", response_model=OrderOut)
async def get_order_details(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items))
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد.")
    return order
