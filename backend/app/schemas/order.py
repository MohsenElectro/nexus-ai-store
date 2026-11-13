from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.order import OrderStatus

class OrderCreate(BaseModel):
    product_id: int
    target_email: Optional[str] = Field(None, json_schema_extra={"example": "user@gmail.com"}, description="ایمیل مشتری در صورتی که سفارش نیاز به شارژ مستقیم داشته باشد")
    customer_notes: Optional[str] = Field(None, json_schema_extra={"example": "لطفاً بعد از شارژ اطلاع دهید"})
    discount_code: Optional[str] = Field(None, json_schema_extra={"example": "WELCOME"}, description="کد تخفیف اختصاصی یا عمومی")

class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price_toman: int
    unit_price_usdt: float
    delivered_data: Optional[str] = None

class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    total_toman: int
    total_usdt: float
    discount_toman: int = 0
    discount_code: Optional[str] = None
    status: OrderStatus
    target_email: Optional[str]
    customer_notes: Optional[str]
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemOut] = []

class OrderManualFulfill(BaseModel):
    order_id: Optional[int] = None
    admin_notes: Optional[str] = Field(None, json_schema_extra={"example": "اکانت با ویزاکارت با موفقیت شارژ شد."})
