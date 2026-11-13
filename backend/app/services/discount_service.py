from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from fastapi import HTTPException, status

from app.models.discount import DiscountCode, DiscountType
from app.core.database import utc_now
from app.schemas.discount import DiscountCodeCreate

class DiscountService:
    @staticmethod
    async def validate_and_calculate_discount(
        db: AsyncSession,
        code_str: str,
        order_amount_toman: int,
    ) -> Dict[str, Any]:
        cleaned_code = code_str.strip().upper()
        if not cleaned_code:
            return {
                "valid": False,
                "code": "",
                "discount_toman": 0,
                "final_amount_toman": order_amount_toman,
                "message": "کد تخفیف وارد نشده است.",
            }

        res = await db.execute(
            select(DiscountCode).where(DiscountCode.code == cleaned_code)
        )
        d = res.scalar_one_or_none()

        if not d or not d.is_active:
            return {
                "valid": False,
                "code": cleaned_code,
                "discount_toman": 0,
                "final_amount_toman": order_amount_toman,
                "message": "کد تخفیف معتبر نیست یا غیرفعال شده است.",
            }

        now = utc_now()
        # Handle naive datetime comparison if needed
        if d.expires_at:
            exp = d.expires_at if d.expires_at.tzinfo else d.expires_at.replace(tzinfo=now.tzinfo)
            if exp < now:
                return {
                    "valid": False,
                    "code": cleaned_code,
                    "discount_toman": 0,
                    "final_amount_toman": order_amount_toman,
                    "message": "مهلت استفاده از این کد تخفیف به پایان رسیده است.",
                }

        if d.usage_limit is not None and d.used_count >= d.usage_limit:
            return {
                "valid": False,
                "code": cleaned_code,
                "discount_toman": 0,
                "final_amount_toman": order_amount_toman,
                "message": "سقف استفاده از این کد تخفیف تکمیل شده است.",
            }

        if d.min_order_toman > 0 and order_amount_toman < d.min_order_toman:
            return {
                "valid": False,
                "code": cleaned_code,
                "discount_toman": 0,
                "final_amount_toman": order_amount_toman,
                "message": f"حداقل مبلغ سفارش برای اعمال این کد {d.min_order_toman:,} تومان است.",
            }

        # Calculate discount
        if d.discount_type == DiscountType.PERCENT:
            calculated = round((order_amount_toman * d.value) / 100)
            if d.max_amount_toman and calculated > d.max_amount_toman:
                calculated = d.max_amount_toman
            discount_toman = min(calculated, order_amount_toman)
        else:
            discount_toman = min(d.value, order_amount_toman)

        final_amount_toman = max(0, order_amount_toman - discount_toman)

        return {
            "valid": True,
            "code": d.code,
            "discount_type": d.discount_type,
            "value": d.value,
            "discount_toman": discount_toman,
            "final_amount_toman": final_amount_toman,
            "message": f"کد تخفیف با موفقیت اعمال شد ({discount_toman:,} تومان کسر شد).",
        }

    @staticmethod
    async def create_discount_code(
        db: AsyncSession,
        data: DiscountCodeCreate,
    ) -> DiscountCode:
        cleaned_code = data.code.strip().upper()
        # Check uniqueness
        res = await db.execute(select(DiscountCode).where(DiscountCode.code == cleaned_code))
        if res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="کد تخفیف با این نام قبلاً ایجاد شده است.",
            )

        if data.discount_type == DiscountType.PERCENT and data.value > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.",
            )

        item = DiscountCode(
            code=cleaned_code,
            discount_type=data.discount_type,
            value=data.value,
            max_amount_toman=data.max_amount_toman,
            min_order_toman=data.min_order_toman,
            usage_limit=data.usage_limit,
            expires_at=data.expires_at,
            is_active=data.is_active,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def list_all_codes(db: AsyncSession) -> List[DiscountCode]:
        res = await db.execute(select(DiscountCode).order_by(DiscountCode.created_at.desc()))
        return res.scalars().all()

    @staticmethod
    async def toggle_active(db: AsyncSession, code_id: int) -> DiscountCode:
        res = await db.execute(select(DiscountCode).where(DiscountCode.id == code_id))
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="کد تخفیف یافت نشد.")
        item.is_active = not item.is_active
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def delete_code(db: AsyncSession, code_id: int) -> bool:
        res = await db.execute(select(DiscountCode).where(DiscountCode.id == code_id))
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="کد تخفیف یافت نشد.")
        await db.delete(item)
        await db.commit()
        return True

discount_service = DiscountService()
