from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.user import User
from app.schemas.discount import (
    DiscountCodeCreate,
    DiscountCodeOut,
    DiscountValidateRequest,
    DiscountValidateResponse,
)
from app.services.discount_service import discount_service

router = APIRouter()

@router.post("/validate", response_model=DiscountValidateResponse)
async def validate_discount_code(
    payload: DiscountValidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validates a discount coupon code for a given order amount.
    Returns calculated discount amount and discounted total.
    """
    res = await discount_service.validate_and_calculate_discount(
        db=db,
        code_str=payload.code,
        order_amount_toman=payload.order_amount_toman,
    )
    return DiscountValidateResponse(
        valid=res["valid"],
        code=res.get("code", payload.code),
        discount_type=res.get("discount_type"),
        value=res.get("value"),
        discount_toman=res.get("discount_toman", 0),
        final_amount_toman=res.get("final_amount_toman", payload.order_amount_toman),
        message=res.get("message", ""),
    )

@router.get("/", response_model=List[DiscountCodeOut])
async def list_all_discount_codes(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Admin-only: list all active and past discount codes."""
    return await discount_service.list_all_codes(db)

@router.post("/", response_model=DiscountCodeOut, status_code=status.HTTP_201_CREATED)
async def create_new_discount_code(
    data: DiscountCodeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Admin-only: create a new discount code."""
    return await discount_service.create_discount_code(db, data)

@router.patch("/{code_id}/toggle", response_model=DiscountCodeOut)
async def toggle_discount_code_status(
    code_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Admin-only: toggle active state of a discount code."""
    return await discount_service.toggle_active(db, code_id)

@router.delete("/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discount_code(
    code_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Admin-only: delete a discount code."""
    await discount_service.delete_code(db, code_id)
    return None
