from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.discount import DiscountType

class DiscountCodeCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, description="کد تخفیف به حروف انگلیسی و عدد")
    discount_type: DiscountType = Field(DiscountType.PERCENT, description="نوع تخفیف: درصدی یا مبلغ ثابت")
    value: int = Field(..., gt=0, description="درصد تخفیف (۱ تا ۱۰۰) یا مبلغ به تومان")
    max_amount_toman: Optional[int] = Field(None, description="سقف تخفیف برای تخفیف‌های درصدی به تومان")
    min_order_toman: int = Field(0, ge=0, description="حداقل مبلغ سفارش برای اعمال این کد")
    usage_limit: Optional[int] = Field(None, gt=0, description="سقف تعداد استفاده کلی")
    expires_at: Optional[datetime] = Field(None, description="تاریخ انقضای کد تخفیف")
    is_active: bool = Field(True, description="وضعیت فعال/غیرفعال بودن کد")

class DiscountCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    discount_type: DiscountType
    value: int
    max_amount_toman: Optional[int] = None
    min_order_toman: int = 0
    usage_limit: Optional[int] = None
    used_count: int = 0
    expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

class DiscountValidateRequest(BaseModel):
    code: str
    order_amount_toman: int = Field(..., gt=0, description="مبلغ سفارش جهت محاسبه درصد و شروط کد")

class DiscountValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: Optional[DiscountType] = None
    value: Optional[int] = None
    discount_toman: int = 0
    final_amount_toman: int
    message: str
